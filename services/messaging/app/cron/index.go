package main

import (
	"fmt"
	"os"
)

var environment = os.Getenv("environment")

func main() {
	fmt.Printf("Running cron job. Environment: %s", environment)
}
