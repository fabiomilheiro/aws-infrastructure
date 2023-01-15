package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	ginproxy "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var env = os.Getenv("environment")

type Response struct {
	Message string
}

type Order struct {
	Id     string
	Value  float64
	UserId string
}

var orders = []Order{
	{Id: "O1", Value: 1000, UserId: "U1"},
	{Id: "O2", Value: 10, UserId: "U1"},
	{Id: "O3", Value: 100, UserId: "U1"},
	{Id: "O4", Value: 500, UserId: "U2"},
}

func main() {
	fmt.Println("Registering routes...")
	router := gin.Default()
	router.GET("/orders", func(c *gin.Context) {
		c.JSON(http.StatusOK, orders)
	})
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.RequestURI
		c.JSON(
			http.StatusNotFound,
			Response{
				Message: fmt.Sprintf("Could not find route with path %s", path),
			})
	})

	if err := router.SetTrustedProxies(nil); err != nil {
		fmt.Printf("Could not set trusted proxies as nil. %+v", err)
	}

	if env == "" {
		if err := router.Run(":81"); err != nil {
			fmt.Printf("Could not run the api. %+v", err)
		}

		return
	}

	ginAdapter := ginproxy.NewV2(router)
	lambda.Start(func(
		context context.Context,
		request events.APIGatewayV2HTTPRequest,
	) (events.APIGatewayV2HTTPResponse, error) {
		return ginAdapter.ProxyWithContext(context, request)
	})
}
