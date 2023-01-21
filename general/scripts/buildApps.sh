cd ../../services
GOOS=linux
GOARCH=x86_64
CGO_ENABLED=1
echo "GOOS=$GOOS, GOARCH=$GOARCH, CGO_ENABLED=$CGO_ENABLED"
cd user/app

echo "Building users API..."
go build -o out/api ./api/index.go
build-lambda-zip -o out/api.zip out/api

echo "Building users message consumer..."
go build -o out/messageconsumer ./messageconsumer/index.go
build-lambda-zip -o out/messageconsumer.zip out/messageconsumer

echo "Building users cron..."
go build -o out/cron ./cron/index.go
build-lambda-zip -o out/cron.zip out/cron

cd ../../messaging/app
echo "Building messaging API..."
go build -o out/api ./api/index.go
build-lambda-zip -o out/api.zip out/api

echo "Building messaging message consumer..."
go build -o out/messageconsumer ./messageconsumer/index.go
build-lambda-zip -o out/messageconsumer.zip out/messageconsumer

echo "Building messaging cron..."
go build -o out/cron ./cron/index.go
build-lambda-zip -o out/cron.zip out/cron