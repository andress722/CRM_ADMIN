using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Ecommerce.Infrastructure.Data;

public class EcommerceDbContextFactory : IDesignTimeDbContextFactory<EcommerceDbContext>
{
    public EcommerceDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();
        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile(Path.Combine("src", "Ecommerce.API", "appsettings.json"), optional: true)
            .AddJsonFile(Path.Combine("src", "Ecommerce.API", "appsettings.Development.json"), optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5433;Database=ecommerce;Username=admin;Password=CHANGE_ME;SslMode=disable;";

        var optionsBuilder = new DbContextOptionsBuilder<EcommerceDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new EcommerceDbContext(optionsBuilder.Options);
    }
}
