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

var env = os.Getenv("APP_ENV")

type Response struct {
	Message string
}

type User struct {
	Id                 string
	Name               string
	NumberOfOrders     int
	TotalValueOfOrders float64
}

var users = []User{
	{Id: "U1", Name: "John"},
	{Id: "U2", Name: "Jim"},
	{Id: "U3", Name: "Arnold"},
	{Id: "U4", Name: "Jack"},
}

func main() {
	fmt.Println("Registering routes...")
	router := gin.Default()
	router.GET("/users", func(c *gin.Context) {
		c.JSON(http.StatusOK, users)
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
