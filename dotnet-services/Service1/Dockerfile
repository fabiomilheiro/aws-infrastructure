FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app

COPY ./Service1.csproj ./Service1.csproj

RUN dotnet restore .

COPY . .

RUN dotnet publish . -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app/out .
ENV DOTNET_EnableDiagnostics=1
RUN apt-get update && apt-get install curl -y
HEALTHCHECK --interval=5s --timeout=3s --start-period=3s CMD curl --fail http://localhost:80/health || exit
ENTRYPOINT ["dotnet", "Service1.dll"]