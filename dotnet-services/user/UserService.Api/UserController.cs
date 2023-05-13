using Microsoft.AspNetCore.Mvc;
using UserService.Api.ApiModels;

namespace UserService.Api
{
    [ApiController]
    [Route("users")]
    public class UserController : ControllerBase
    {
        [HttpGet]
        public IEnumerable<UserApiModel> GetUsers()
        {
            return new List<UserApiModel> {
                new UserApiModel{ Id = 1, Name = "Joseph", Email = "joseph@gmail.com" },
                new UserApiModel{ Id = 2, Name = "James", Email = "james@gmail.com" },
                new UserApiModel{ Id = 3, Name = "John", Email = "john@gmail.com" },
                new UserApiModel{ Id = 4, Name = "Jetson", Email = "jetson@gmail.com" },
                };
        }
    }
}
