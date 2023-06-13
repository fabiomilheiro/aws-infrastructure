using Microsoft.AspNetCore.Mvc;
using Service1.ApiModels;

namespace Service1.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UsersController : ControllerBase
    {
        private static UserApiModel[] Users = new[]
        {
            new UserApiModel{ Id = 1, Name = "John Smith" },
            new UserApiModel{ Id = 2, Name = "Jane Smith" },
            new UserApiModel{ Id = 3, Name = "James Smith" },
            new UserApiModel{ Id = 4, Name = "Jim Smith" },
            new UserApiModel{ Id = 5, Name = "Jim Smith" },
        };

        public UsersController(HttpClient httpClient, IConfiguration config)
        {
            this.httpClient = httpClient;
            var environmentName = config["EnvironmentName"];
            this.httpClient.BaseAddress = new Uri(config["Service2BaseUrl"] ?? $"service2.{environmentName}");
        }

        private HttpClient httpClient { get; }

        [HttpGet]
        public IActionResult GetUsers()
        {
            return this.Ok(Users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserWithWeather(int id)
        {
            var user = Users.FirstOrDefault(x => x.Id == id);

            if (user == null)
            {
                return this.NotFound();
            }

            var weather = await this.httpClient.GetFromJsonAsync<Weather>("/WeatherForecast");

            if (weather == null)
            {
                return this.Ok(new UserWeatherApiModel
                {
                    Name = user.Name,
                    Temperature = "not available",
                });
            }

            return this.Ok(new UserWeatherApiModel
            {
                Name = user.Name,
                Temperature = weather.TemperatureC + "C (from service 2)",
            });
        }

        private class Weather
        {
            public int TemperatureC { get; set; }
        }
    }
}
