cd ../dotnet-services/user
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 715815605776.dkr.ecr.eu-west-1.amazonaws.com
docker build . -t userservice --file ./UserService.Api/Dockerfile
docker tag userservice:latest 715815605776.dkr.ecr.eu-west-1.amazonaws.com/userservice:latest
docker push 715815605776.dkr.ecr.eu-west-1.amazonaws.com/userservice:latest