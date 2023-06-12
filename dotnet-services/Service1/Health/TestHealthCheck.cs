using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Service1.Health
{
    public class TestHealthCheck : IHealthCheck
    {
        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            Console.WriteLine("Executing test health check...");
            return Task.FromResult(
                new HealthCheckResult(
                    HealthStatus.Healthy,
                    "All good"
                    ));
        }
    }
}
