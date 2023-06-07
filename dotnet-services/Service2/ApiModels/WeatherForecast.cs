namespace Service2.ApiModels
{
    public class WeatherForecast
    {
        public DateTime Date { get; internal set; }

        public int TemperatureC { get; internal set; }

        public string Summary { get; internal set; } = string.Empty;
    }
}