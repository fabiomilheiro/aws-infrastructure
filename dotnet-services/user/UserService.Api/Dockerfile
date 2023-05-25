FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app

# Expected working directory to be solution directory
COPY ./UserService.Api/UserService.Api.csproj ./UserService.Api/UserService.Api.csproj
COPY ./UserService.Core/UserService.Core.csproj ./UserService.Core/UserService.Core.csproj

RUN dotnet restore ./UserService.Api

COPY ./UserService.Api ./UserService.Api
COPY ./UserService.Core ./UserService.Core

RUN dotnet publish ./UserService.Api -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app/out .
ENV DOTNET_EnableDiagnostics=0
ENTRYPOINT ["dotnet", "UserService.Api.dll"]