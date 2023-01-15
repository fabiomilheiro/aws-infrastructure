package main

import (
	"fmt"

	"github.com/fabiomilheiro/aws-infratructure/services/order/shared"
)

func main() {
	fmt.Printf("Running cron job. Environment: %s", shared.Environment)
}
