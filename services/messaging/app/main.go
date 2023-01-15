package main

import (
	"fmt"
	"os"

	"github.com/fabiomilheiro/aws-infratructure/services/order/shared"
)

var env = os.Getenv("environment")

type Response struct {
	Message string
}

func main() {
	fmt.Printf("Running Main. Environment = %s", shared.Environment)

}
