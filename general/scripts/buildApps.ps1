cd ../../services
$env:GOOS="linux"
$env:GOARCH="x86_64"
$env:CGO_ENABLED="1"
echo "GOOS=$env:GOOS, GOARCH=$env:GOARCH, CGO_ENABLED=$env:CGO_ENABLED"

echo "*** User service ***"
cd user/app
pwd
echo "Building users API..."
cd api
go build -o ../out/api ./index.go
build-lambda-zip -o ../out/api.zip ../out/api

echo "Building users message consumer..."
cd ../messageconsumer
go build -o ../out/messageconsumer ./index.go
build-lambda-zip -o ../out/messageconsumer.zip ../out/messageconsumer

echo "Building users cron..."
cd ../cron
go build -o ../out/cron ./index.go
build-lambda-zip -o ../out/cron.zip ../out/cron

cd ../../..
pwd

echo "*** Messaging service ***"
cd messaging/app
pwd
echo "Building messaging API..."
cd api
go build -o ../out/api ./index.go
build-lambda-zip -o ../out/api.zip ../out/api

echo "Building messaging message consumer..."
cd ../messageconsumer
go build -o ../out/messageconsumer ./index.go
build-lambda-zip -o ../out/messageconsumer.zip ../out/messageconsumer

echo "Building messaging cron..."
cd ../cron
go build -o ../out/cron ./index.go
build-lambda-zip -o ../out/cron.zip ../out/cron