# 🚀 QUICK START COMMANDS

## Backend Setup & Run

### Build
```bash
cd src
dotnet build
```

### Run API
```bash
cd src\Ecommerce.API
dotnet run
# API em http://localhost:5071
# Swagger em http://localhost:5071/swagger
```

### Test Health Check
```bash
curl http://localhost:5071/health
```

---

## Frontend Setup & Run

### Install Dependencies
```bash
cd admin-frontend
npm install
```

### Run Development Server
```bash
npm run dev
# Dashboard em http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

---

## API Testing (cURL)

### Create Product
```bash
curl -X POST http://localhost:5071/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notebook",
    "description": "High performance notebook",
    "price": 3500.00,
    "stock": 10,
    "category": "Electronics",
    "sku": "NB-001"
  }'
```

### Get All Products
```bash
curl http://localhost:5071/api/v1/products
```

### Get Dashboard Statistics
```bash
curl http://localhost:5071/api/v1/admin/statistics/dashboard
```

### Get Top Products
```bash
curl http://localhost:5071/api/v1/admin/statistics/top-products?limit=10
```

### Get Top Categories
```bash
curl http://localhost:5071/api/v1/admin/statistics/top-categories
```

### Update Product Stock
```bash
curl -X PATCH http://localhost:5071/api/v1/admin/products/{id}/stock \
  -H "Content-Type: application/json" \
  -d '{"newStock": 25}'
```

### Delete Product
```bash
curl -X DELETE http://localhost:5071/api/v1/admin/products/{id}
```

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5071/api/v1
```

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=ecommerce;Username=postgres;Password=password"
  }
}
```

---

## Docker Commands

### List Containers
```bash
docker ps
```

### View PostgreSQL Logs
```bash
docker logs ecommerce-postgres
```

### View Redis Logs
```bash
docker logs ecommerce-redis
```

### Stop Containers
```bash
docker-compose down
```

### Start Containers
```bash
docker-compose up -d
```

---

## Database Commands

### Generate Migration
```bash
cd src\Ecommerce.API
dotnet ef migrations add MigrationName
```

### Update Database
```bash
dotnet ef database update
```

### Drop Database
```bash
dotnet ef database drop
```

---

## Project Structure

### Backend
```
src/
├── Ecommerce.Domain/          → Entities
├── Ecommerce.Application/     → Services
├── Ecommerce.Infrastructure/  → Repositories
└── Ecommerce.API/             → Controllers
```

### Frontend
```
admin-frontend/
├── app/                       → Pages
├── components/                → React Components
├── lib/                       → Utilities
└── package.json
```

---

## Useful Links

- **API Swagger:** http://localhost:5071/swagger
- **Admin Dashboard:** http://localhost:3000
- **Backend Health:** http://localhost:5071/health
- **PostgreSQL:** localhost:5432 (user: postgres, password: password)
- **Redis:** localhost:6379

---

## Troubleshooting

### API Won't Start
```bash
# Check if port 5071 is in use
netstat -ano | findstr :5071

# Kill process using the port
taskkill /PID {PID} /F
```

### Frontend Won't Start
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install
npm run dev
```

### PostgreSQL Connection Issues
```bash
# Check if container is running
docker ps

# View container logs
docker logs ecommerce-postgres

# Restart container
docker restart ecommerce-postgres
```

### Port Conflicts
```bash
# Change backend port in launchSettings.json
# Change frontend port with: npm run dev -- -p 3001
```

---

## Common Tasks

### Format Code
```bash
# Backend - C#
dotnet format

# Frontend - TypeScript/JSX
npm run lint
```

### Run Tests
```bash
# Backend
cd src
dotnet test

# Frontend
npm test
```

### Deploy Frontend
```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy --prod
```

### Deploy Backend
```bash
# Publish
dotnet publish -c Release

# Azure App Service
az webapp deployment source config-zip --resource-group {group} --name {app-name} --src {zip-file}
```

---

## Performance Tips

1. **Enable Redis Caching**
   - Uncomment Redis configuration
   - Add cache decorator to services

2. **Enable GZIP Compression**
   - Add in Program.cs: `app.UseResponseCompression();`

3. **Add Rate Limiting**
   - Install NuGet: `AspNetCoreRateLimit`
   - Configure in Program.cs

4. **Add CORS**
   - Configure in Program.cs for production domains

---

## Security Checklist

- [ ] Add JWT authentication
- [ ] Enable CORS for production domains
- [ ] Add rate limiting
- [ ] Use HTTPS in production
- [ ] Validate all inputs
- [ ] Hash passwords (already done)
- [ ] Add CSRF protection
- [ ] Enable security headers
- [ ] Regular security audits

---

## Monitoring & Logging

### View Logs
```bash
# Backend logs (check terminal output)
# Frontend logs (check browser console)
# Docker logs
docker logs -f ecommerce-postgres
docker logs -f ecommerce-redis
```

### Application Insights (Future)
```csharp
// Add to Program.cs
builder.Services.AddApplicationInsightsTelemetry();
```

---

## Git Commands

### Clone Repository
```bash
git clone <repository-url>
cd copilot-sdk-main
```

### Commit Changes
```bash
git add .
git commit -m "Feature: Description"
git push origin main
```

### Create Branch
```bash
git checkout -b feature/feature-name
```

---

## VSCode Extensions (Recommended)

- C# (powered by OmniSharp)
- .NET Core Tools
- REST Client
- Thunder Client
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense

---

## Additional Resources

- **Microsoft Docs:** https://docs.microsoft.com
- **Next.js Docs:** https://nextjs.org/docs
- **React Docs:** https://react.dev
- **Tailwind Docs:** https://tailwindcss.com/docs
- **Entity Framework:** https://docs.microsoft.com/en-us/ef

---

**Last Updated:** Dezembro 2024

**Project Status:** 🟡 Em consolidacao
