FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# copy csproj and restore as a distinct layer
COPY ./src/Ecommerce.API/*.csproj ./Ecommerce.API/
COPY ./src/Ecommerce.Infrastructure/*.csproj ./Ecommerce.Infrastructure/
RUN dotnet restore Ecommerce.API/Ecommerce.API.csproj

# copy everything else and build
COPY ./src .
WORKDIR /src/Ecommerce.API
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Ecommerce.API.dll"]
