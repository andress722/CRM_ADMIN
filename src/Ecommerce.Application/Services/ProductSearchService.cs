using System.Text;
using System.Text.Json;
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Application.Services;

public class ProductSearchService
{
    private readonly IProductRepository _repository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProductSearchService> _logger;

    public ProductSearchService(
        IProductRepository repository,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ProductSearchService> logger)
    {
        _repository = repository;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ProductSearchResult> SearchAsync(
        string? query,
        string? category,
        decimal? minPrice,
        decimal? maxPrice,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var provider = (_configuration["Search:Provider"] ?? "database").Trim();
        if (!provider.Equals("database", StringComparison.OrdinalIgnoreCase))
        {
            var remote = await TryRemoteSearchAsync(provider, query, category, minPrice, maxPrice, page, pageSize, ct);
            if (remote != null)
            {
                return remote;
            }
        }

        return await SearchWithDatabaseFallbackAsync(query, category, minPrice, maxPrice, page, pageSize);
    }

    private async Task<ProductSearchResult?> TryRemoteSearchAsync(
        string provider,
        string? query,
        string? category,
        decimal? minPrice,
        decimal? maxPrice,
        int page,
        int pageSize,
        CancellationToken ct)
    {
        var baseUrl = _configuration["Search:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri))
        {
            _logger.LogWarning("Search:BaseUrl is invalid. Falling back to database search.");
            return null;
        }

        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = baseUri;
        client.Timeout = TimeSpan.FromSeconds(Math.Max(2, _configuration.GetValue("Search:TimeoutSeconds", 5)));

        var apiKey = _configuration["Search:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            var headerName = _configuration["Search:ApiKeyHeader"] ?? "Authorization";
            var headerValue = headerName.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
                ? $"Bearer {apiKey}"
                : apiKey;
            client.DefaultRequestHeaders.Remove(headerName);
            client.DefaultRequestHeaders.TryAddWithoutValidation(headerName, headerValue);
        }

        var request = BuildRemoteRequest(provider, query, category, minPrice, maxPrice, page, pageSize);

        try
        {
            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Remote search provider {Provider} returned HTTP {StatusCode}. Falling back to database.", provider, (int)response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            if (string.IsNullOrWhiteSpace(body))
            {
                return null;
            }

            return ParseRemoteResponse(provider, body, page, pageSize);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Remote search provider {Provider} failed. Falling back to database.", provider);
            return null;
        }
    }

    private HttpRequestMessage BuildRemoteRequest(
        string provider,
        string? query,
        string? category,
        decimal? minPrice,
        decimal? maxPrice,
        int page,
        int pageSize)
    {
        if (provider.Equals("meilisearch", StringComparison.OrdinalIgnoreCase))
        {
            var indexName = _configuration["Search:IndexName"] ?? "products";
            var path = _configuration["Search:QueryPath"] ?? $"/indexes/{indexName}/search";
            var filters = new List<string>();
            if (!string.IsNullOrWhiteSpace(category)) filters.Add($"category = '{category.Trim().Replace("'", "\\'")}'");
            if (minPrice.HasValue) filters.Add($"price >= {minPrice.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)}");
            if (maxPrice.HasValue) filters.Add($"price <= {maxPrice.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)}");

            var payload = new
            {
                q = query ?? string.Empty,
                offset = (page - 1) * pageSize,
                limit = pageSize,
                filter = filters.Count == 0 ? null : filters,
                facets = new[] { "category" }
            };

            return NewJsonRequest(HttpMethod.Post, path, payload);
        }

        var elasticPath = _configuration["Search:QueryPath"] ?? $"/{(_configuration["Search:IndexName"] ?? "products")}/_search";
        var must = new List<object>();
        var filter = new List<object>();
        if (!string.IsNullOrWhiteSpace(query))
        {
            must.Add(new { multi_match = new { query, fields = new[] { "name^3", "description", "category^2", "sku^4" } } });
        }
        if (!string.IsNullOrWhiteSpace(category)) filter.Add(new { term = new Dictionary<string, string> { ["category.keyword"] = category.Trim() } });
        if (minPrice.HasValue || maxPrice.HasValue)
        {
            filter.Add(new
            {
                range = new Dictionary<string, object>
                {
                    ["price"] = new Dictionary<string, decimal?>
                    {
                        ["gte"] = minPrice,
                        ["lte"] = maxPrice
                    }
                }
            });
        }

        var elasticPayload = new
        {
            from = (page - 1) * pageSize,
            size = pageSize,
            query = new { @bool = new { must, filter } },
            aggs = new { categories = new { terms = new { field = "category.keyword", size = 20 } } }
        };

        return NewJsonRequest(HttpMethod.Post, elasticPath, elasticPayload);
    }

    private static HttpRequestMessage NewJsonRequest(HttpMethod method, string path, object payload)
    {
        return new HttpRequestMessage(method, path)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
    }

    private ProductSearchResult ParseRemoteResponse(string provider, string body, int page, int pageSize)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        if (provider.Equals("meilisearch", StringComparison.OrdinalIgnoreCase))
        {
            var items = root.TryGetProperty("hits", out var hitsElement)
                ? hitsElement.EnumerateArray().Select(MapRemoteProduct).ToList()
                : new List<Product>();
            var total = root.TryGetProperty("estimatedTotalHits", out var totalElement)
                ? totalElement.GetInt32()
                : items.Count;
            var facets = root.TryGetProperty("facetDistribution", out var facetElement)
                ? ParseFacetDistribution(facetElement)
                : Array.Empty<SearchFacetBucket>();

            return new ProductSearchResult(items, total, page, pageSize, provider, facets, BuildSuggestions(items, null));
        }

        var elasticHits = root.GetProperty("hits");
        var elasticItems = elasticHits.GetProperty("hits").EnumerateArray()
            .Select(hit => MapRemoteProduct(hit.GetProperty("_source")))
            .ToList();
        var elasticTotal = elasticHits.GetProperty("total").GetProperty("value").GetInt32();
        var elasticFacets = root.TryGetProperty("aggregations", out var aggs)
            ? ParseElasticAggregations(aggs)
            : Array.Empty<SearchFacetBucket>();

        return new ProductSearchResult(elasticItems, elasticTotal, page, pageSize, provider, elasticFacets, BuildSuggestions(elasticItems, null));
    }

    private async Task<ProductSearchResult> SearchWithDatabaseFallbackAsync(
        string? query,
        string? category,
        decimal? minPrice,
        decimal? maxPrice,
        int page,
        int pageSize)
    {
        var allProducts = await _repository.GetAllAsync();
        var filtered = allProducts
            .Where(p => MatchesProduct(p, query, category, minPrice, maxPrice))
            .OrderByDescending(p => ComputeScore(p, query))
            .ThenByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.ViewCount)
            .ThenBy(p => p.Name)
            .ToList();

        var total = filtered.Count;
        var items = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var facets = filtered
            .GroupBy(p => p.Category)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Select(g => new SearchFacetBucket(g.Key, g.Count()))
            .ToList();

        return new ProductSearchResult(items, total, page, pageSize, "database", facets, BuildSuggestions(filtered, query));
    }

    private static bool MatchesProduct(Product product, string? query, string? category, decimal? minPrice, decimal? maxPrice)
    {
        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(product.Category, category.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (minPrice.HasValue && product.Price < minPrice.Value) return false;
        if (maxPrice.HasValue && product.Price > maxPrice.Value) return false;

        if (string.IsNullOrWhiteSpace(query)) return true;

        var term = query.Trim();
        return product.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
            || product.Description.Contains(term, StringComparison.OrdinalIgnoreCase)
            || product.Category.Contains(term, StringComparison.OrdinalIgnoreCase)
            || product.Sku.Contains(term, StringComparison.OrdinalIgnoreCase);
    }

    private static int ComputeScore(Product product, string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return (product.IsFeatured ? 50 : 0) + product.ViewCount;
        }

        var score = 0;
        var term = query.Trim();
        if (product.Name.Contains(term, StringComparison.OrdinalIgnoreCase)) score += 100;
        if (product.Sku.Contains(term, StringComparison.OrdinalIgnoreCase)) score += 80;
        if (product.Category.Contains(term, StringComparison.OrdinalIgnoreCase)) score += 40;
        if (product.Description.Contains(term, StringComparison.OrdinalIgnoreCase)) score += 20;
        if (product.IsFeatured) score += 10;
        score += Math.Min(product.ViewCount, 25);
        return score;
    }

    private static Product MapRemoteProduct(JsonElement element)
    {
        return new Product
        {
            Id = element.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String ? Guid.Parse(id.GetString()!) : Guid.Empty,
            Name = element.TryGetProperty("name", out var name) ? name.GetString() ?? string.Empty : string.Empty,
            Description = element.TryGetProperty("description", out var description) ? description.GetString() ?? string.Empty : string.Empty,
            Price = element.TryGetProperty("price", out var price) ? price.GetDecimal() : 0,
            Stock = element.TryGetProperty("stock", out var stock) ? stock.GetInt32() : 0,
            Category = element.TryGetProperty("category", out var category) ? category.GetString() ?? string.Empty : string.Empty,
            Sku = element.TryGetProperty("sku", out var sku) ? sku.GetString() ?? string.Empty : string.Empty,
            IsActive = true,
            IsFeatured = element.TryGetProperty("isFeatured", out var featured) && featured.ValueKind == JsonValueKind.True,
            ViewCount = element.TryGetProperty("viewCount", out var views) ? views.GetInt32() : 0,
            CreatedAt = DateTime.UtcNow,
        };
    }

    private static IReadOnlyList<SearchFacetBucket> ParseFacetDistribution(JsonElement facetElement)
    {
        if (!facetElement.TryGetProperty("category", out var categories) || categories.ValueKind != JsonValueKind.Object)
        {
            return Array.Empty<SearchFacetBucket>();
        }

        return categories.EnumerateObject()
            .Select(property => new SearchFacetBucket(property.Name, property.Value.GetInt32()))
            .OrderByDescending(x => x.Count)
            .ToList();
    }

    private static IReadOnlyList<SearchFacetBucket> ParseElasticAggregations(JsonElement aggs)
    {
        if (!aggs.TryGetProperty("categories", out var categories)
            || !categories.TryGetProperty("buckets", out var buckets)
            || buckets.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<SearchFacetBucket>();
        }

        return buckets.EnumerateArray()
            .Select(bucket => new SearchFacetBucket(
                bucket.TryGetProperty("key", out var key) ? key.GetString() ?? string.Empty : string.Empty,
                bucket.TryGetProperty("doc_count", out var count) ? count.GetInt32() : 0))
            .Where(bucket => !string.IsNullOrWhiteSpace(bucket.Value))
            .OrderByDescending(bucket => bucket.Count)
            .ToList();
    }

    private static IReadOnlyList<string> BuildSuggestions(IEnumerable<Product> products, string? query)
    {
        var seed = string.IsNullOrWhiteSpace(query) ? null : query.Trim();
        return products
            .SelectMany(p => new[] { p.Name, p.Category, p.Sku })
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Where(value => seed == null || value.Contains(seed, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToList();
    }
}

public sealed record ProductSearchResult(
    IReadOnlyList<Product> Items,
    int Total,
    int Page,
    int PageSize,
    string Engine,
    IReadOnlyList<SearchFacetBucket> Facets,
    IReadOnlyList<string> Suggestions);

public sealed record SearchFacetBucket(string Value, int Count);
