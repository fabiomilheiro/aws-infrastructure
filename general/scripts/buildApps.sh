cd ../../services
GOOS=linux
GOARCH=x86_64
CGO_ENABLED=1
echo "GOOS=$GOOS, GOARCH=$GOARCH, CGO_ENABLED=$CGO_ENABLED"

echo "*** User service ***"
cd user/app
pwd
echo "Removing old outputs..."
rm out/**
rm -d out
echo "Building users API..."
cd api
go build -o ../out/api ./index.go
cd ../out
zip api.zip api

echo "Building users message consumer..."
cd ../messageconsumer
go build -o ../out/messageconsumer ./index.go
cd ../out
zip messageconsumer.zip messageconsumer

echo "Building users cron..."
cd ../cron
go build -o ../out/cron ./index.go
cd ../out
zip cron.zip cron

cd ../../..
pwd

echo "*** Messaging service ***"
cd messaging/app
pwd
echo "Removing old outputs..."
rm out/**
rm -d out
echo "Building messaging API..."
cd api
go build -o ../out/api ./index.go
cd ../out
zip api.zip api

echo "Building messaging message consumer..."
cd ../messageconsumer
go build -o ../out/messageconsumer ./index.go
cd ../out
zip messageconsumer.zip messageconsumer

echo "Building messaging cron..."
cd ../cron
go build -o ../out/cron ./index.go
cd ../out
zip cron.zip cron