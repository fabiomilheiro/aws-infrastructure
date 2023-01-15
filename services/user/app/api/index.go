package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	ginproxy "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/fabiomilheiro/aws-infratructure/services/order/shared"
	"github.com/gin-gonic/gin"
)

type Response struct {
	Message string
}

func main() {
	fmt.Printf("Running API. Environment = %s", shared.Environment)

	fmt.Println("Registering routes...")
	router := gin.Default()
	router.GET("/users", func(c *gin.Context) {
		c.JSON(http.StatusOK, shared.Users)
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

	if shared.Environment == "" {
		if err := router.Run(":82"); err != nil {
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
