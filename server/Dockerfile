# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY server/TaskManager.Api/TaskManager.Api.csproj server/TaskManager.Api/
RUN dotnet restore server/TaskManager.Api/TaskManager.Api.csproj
COPY server/TaskManager.Api/ server/TaskManager.Api/
RUN dotnet publish server/TaskManager.Api/TaskManager.Api.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "TaskManager.Api.dll"]
