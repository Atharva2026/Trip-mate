import requests
import logging

logger = logging.getLogger("tripmate.weather_tool")


def get_weather_forecast(destination: str) -> dict:
    """
    Get weather forecast for a destination using wttr.in (zero key required).
    Returns a dictionary with:
    - 'success': bool
    - 'current_temp': str
    - 'condition': str
    - 'humidity': str
    - 'forecast': list of str
    - 'raw_text': str
    """
    if not destination:
        return {"success": False, "error": "No destination specified"}

    # Replace spaces with pluses for URL safety
    dest_cleaned = destination.strip().replace(" ", "+")
    url = f"https://wttr.in/{dest_cleaned}?format=j1"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            current = data.get("current_condition", [{}])[0]
            temp_c = current.get("temp_C", "N/A")
            desc = current.get("weatherDesc", [{}])[0].get("value", "N/A")
            humidity = current.get("humidity", "N/A")
            
            # Extract 3-day forecast
            forecast_days = data.get("weather", [])
            forecast_summary = []
            for day in forecast_days[:3]:
                date = day.get("date", "N/A")
                avg_temp = day.get("avgtempC", "N/A")
                # Grab midday hourly description (typically hourly index 4 is 12:00)
                hourly_list = day.get("hourly", [])
                midday = hourly_list[4] if len(hourly_list) > 4 else (hourly_list[0] if hourly_list else {})
                day_desc = midday.get("weatherDesc", [{}])[0].get("value", "N/A")
                forecast_summary.append(f"{date}: {day_desc} ({avg_temp}°C)")

            return {
                "success": True,
                "current_temp": f"{temp_c}°C",
                "condition": desc,
                "humidity": f"{humidity}%",
                "forecast": forecast_summary,
                "raw_text": f"Current weather in {destination}: {desc}, {temp_c}°C. Humidity: {humidity}%."
            }
        else:
            return {"success": False, "error": f"wttr.in returned status code {response.status_code}"}
    except Exception as e:
        logger.error(f"Error fetching weather from wttr.in: {e}")
        return {"success": False, "error": str(e)}
