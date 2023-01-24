package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	ginproxy "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var environment = os.Getenv("environment")

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

var router = gin.Default()

var ginAdapter *ginproxy.GinLambdaV2

func init() {
	log.Printf("Cold start...")
	log.Printf("Running API. Environment = %s", environment)
	log.Println("Registering routes...")
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
		log.Printf("Could not set trusted proxies as nil. %+v", err)
	}

	if environment == "" {
		if err := router.Run(":82"); err != nil {
			log.Printf("Could not run the api. %+v", err)
		}

		return
	}

	ginAdapter = ginproxy.NewV2(router)

}

func main() {
	log.Printf("Executing API (main). Environment = %s", environment)
	lambda.Start(func(
		context context.Context,
		request events.APIGatewayV2HTTPRequest,
	) (events.APIGatewayV2HTTPResponse, error) {
		log.Printf("Executing API (handler). Environment = %s", environment)
		return ginAdapter.ProxyWithContext(context, request)
	})
}
