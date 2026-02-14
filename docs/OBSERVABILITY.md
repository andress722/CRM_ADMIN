# Observability

## Metrics endpoint

The API exposes Prometheus metrics at:

- `/metrics`

### Example Prometheus scrape config

```yaml
scrape_configs:
  - job_name: ecommerce-api
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:5000"]
```

## Metrics emitted

- `http_requests_total{method,path}`
- `http_responses_total{method,path,status}`
- `http_responses_class_total{method,path,class}`
- `http_request_duration_ms_bucket{method,path,le}`
- `http_request_duration_ms_count{method,path}`
- `http_request_duration_ms_sum{method,path}`

## Grafana query examples

### Error rate by route

```
sum(rate(http_responses_class_total{class="5xx"}[5m])) by (path)
```

### P95 latency by route

```
histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le, path))
```

### Request rate by method

```
sum(rate(http_requests_total[5m])) by (method)
```
