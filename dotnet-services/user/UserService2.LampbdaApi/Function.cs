using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using System.Text.Json;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace UserService2.LampbdaApi;

public class Function
{

    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="input"></param>
    /// <param name="context"></param>
    /// <returns></returns>
    public APIGatewayHttpApiV2ProxyResponse FunctionHandler(APIGatewayHttpApiV2ProxyRequest input, ILambdaContext context)
    {
        if (string.IsNullOrEmpty(input.Body))
        {
            return new APIGatewayHttpApiV2ProxyResponse
            {
                StatusCode = 400,
                Body = "Must provide request body",
            };
        }
        var requestBody = JsonSerializer.Deserialize<FunctionRequest>(input.Body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = false,
        });
        var result = $"Hello, {requestBody!.Name}. Your value is = {requestBody.Value}";

        Console.WriteLine($"Result: {result}---");

        return new APIGatewayHttpApiV2ProxyResponse
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(new FunctionResponse
            {
                Result = result,
            }),
        };
    }
}

public class FunctionRequest
{
    public string? Name { get; set; }

    public string? Value { get; set; }

}

public class FunctionResponse
{
    public string Result { get; set; }
}