FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app

COPY ./Service2.csproj ./Service2.csproj

RUN dotnet restore .

COPY . .

RUN dotnet publish . -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app/out .
ENV DOTNET_EnableDiagnostics=0
ENTRYPOINT ["dotnet", "Service2.dll"]