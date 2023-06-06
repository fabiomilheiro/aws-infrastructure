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

        [HttpGet]
        public IActionResult GetUsers()
        {
            return this.Ok(Users);
        }
    }
}
