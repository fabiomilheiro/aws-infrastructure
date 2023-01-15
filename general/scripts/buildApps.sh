cd ../../services
cd user/app
GOOS=linux
GOARCH=x86_64
echo "GOOS=$GOOS, GOARCH=$GOARCH"
go build -o out/main.exe ./main.go
go build -o out/api.exe ./api/index.go
go build -o out/messagehandler.exe ./messagehandler/index.go
go build -o out/cron.exe ./cron/index.go

cd ../../messaging/app
go build -o out/main.exe ./main.go
go build -o out/api.exe ./api/index.go
go build -o out/messagehandler.exe ./messagehandler/index.go
go build -o out/cron.exe ./cron/index.go