using Xunit;
using Amazon.Lambda.Core;
using Amazon.Lambda.TestUtilities;
using Amazon.Lambda.APIGatewayEvents;
using System.Text.Json;

namespace UserService2.LampbdaApi.Tests;

public class FunctionTest
{
    [Fact]
    public void TestToUpperFunction()
    {

        // Invoke the lambda function and confirm the string was upper cased.
        var function = new Function();
        var context = new TestLambdaContext();
        var response = function.FunctionHandler(
            new APIGatewayHttpApiV2ProxyRequest
            {
                Body = JsonSerializer.Serialize(new FunctionRequest
                {
                    Name = "John Smith",
                    Value = "999",
                }),
            }, context);

        Assert.Equal("Hello, John Smith. Your value is = 999", JsonSerializer.Deserialize<FunctionResponse>(response.Body)!.Result);
    }
}
