cd ../services

echo ""
echo ""
echo "*** User service ***"
echo ""
cd user
pwd
echo "Building API..."
cd api
npm install
npm run build
echo "Building cron..."
cd ../cron
rm -rf ./build/**
npm install
npm run build
echo "Building message consumer..."
cd ../messageconsumer
rm -rf ./build/**
npm install
npm run build

echo ""
echo ""
echo "*** Order service ***"
echo ""
cd ../../order
pwd
echo "Building API..."
cd api
rm -rf ./build/**
npm install
npm run build
echo "Building cron..."
cd ../cron
rm -rf ./build/**
npm install
npm run build
echo "Building message consumer..."
cd ../messageconsumer
rm -rf ./build/**
npm install
npm run build

