cd ../services

echo ""
echo "*** User service ***"
cd user
pwd
echo "Building API..."
cd api
npm install
npm run build
echo "Building cron..."
cd ../cron
rm ./build/**
npm install
npm run build
echo "Building message consumer..."
cd ../messageconsumer
rm ./build/**
npm install
npm run build

echo ""
echo "*** Order service ***"
cd ../order
pwd
echo "Building API..."
cd api
rm ./build/**
npm install
npm run build
echo "Building cron..."
cd ../cron
rm ./build/**
npm install
npm run build
echo "Building message consumer..."
cd ../messageconsumer
rm ./build/**
npm install
npm run build

