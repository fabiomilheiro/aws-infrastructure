using Microsoft.AspNetCore.Mvc;
using Service1.ApiModels;

namespace Service1.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class EnvironmentController : ControllerBase
    {
        private readonly IConfiguration configuration;

        public EnvironmentController(IConfiguration configuration)
        {
            this.configuration = configuration;
        }

        [HttpGet]
        public IActionResult GetEnvironmentData()
        {
            return this.Ok(new
            {
                EnvironmentName = this.configuration["EnvironmentName"]
            });
        }
    }
}
