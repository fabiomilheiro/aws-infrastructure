package main

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
)

var environment = os.Getenv("environment")

func main() {
	lambda.Start(func(c context.Context) {
		fmt.Printf("Running cron job. Environment: %s", environment)
	})
}
