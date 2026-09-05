FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first
COPY PingMe.Core/PingMe.Core.csproj                         PingMe.Core/
COPY PingMe.Infrastructure/PingMe.Infrastructure.csproj     PingMe.Infrastructure/
COPY PingMe.Api/PingMe.Api.csproj                           PingMe.Api/

# Restore
RUN dotnet restore PingMe.Api/PingMe.Api.csproj

# Copy everything
COPY . .

# removed --no-restore
RUN dotnet publish PingMe.Api/PingMe.Api.csproj \
    -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
USER app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "PingMe.Api.dll"]