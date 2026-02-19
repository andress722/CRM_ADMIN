FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files first to leverage Docker layer cache
COPY ./src/Ecommerce.API/*.csproj ./Ecommerce.API/
COPY ./src/Ecommerce.Infrastructure/*.csproj ./Ecommerce.Infrastructure/
COPY ./src/Ecommerce.Application/*.csproj ./Ecommerce.Application/
COPY ./src/Ecommerce.Domain/*.csproj ./Ecommerce.Domain/

RUN dotnet restore Ecommerce.API/Ecommerce.API.csproj

# Copy source and publish API
COPY ./src ./
WORKDIR /src/Ecommerce.API
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Ecommerce.API.dll"]
