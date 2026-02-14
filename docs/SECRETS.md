# Secrets and configuration

This project reads configuration from `appsettings.json` and environment variables. Do **not** commit real credentials.

## Environment variable mapping

Use the standard .NET double-underscore mapping:

- `ConnectionStrings__DefaultConnection`
- `Jwt__SecretKey`
- `Payments__MercadoPago__AccessToken`
- `Payments__MercadoPago__WebhookSecret`
- `Shipping__Correios__BaseUrl`
- `Shipping__Correios__AccessToken`
- `Email__SendGrid__ApiKey`

## Example (PowerShell)

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5433;Database=ecommerce;Username=admin;Password=YOUR_PASSWORD;SslMode=disable;"
$env:Jwt__SecretKey = "YOUR_LONG_RANDOM_SECRET"
$env:Payments__MercadoPago__AccessToken = "APP_USR-..."
$env:Payments__MercadoPago__WebhookSecret = "YOUR_WEBHOOK_SECRET"
$env:Shipping__Correios__BaseUrl = "https://your-correios-proxy.example"
$env:Shipping__Correios__AccessToken = "YOUR_CORREIOS_TOKEN"
$env:Email__SendGrid__ApiKey = "YOUR_SENDGRID_KEY"
```

## Rotation

Rotate Access Token and Webhook Secret periodically and update the environment variables on deploy.
