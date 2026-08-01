import requests
import logging

logger = logging.getLogger("tripmate.sunrise_tool")

def fetch_sunrise_sunset(lat: float, lng: float) -> dict:
    """
    Fetch exact astronomical timings (sunrise, sunset, golden hour windows)
    from api.sunrise-sunset.org (keyless and unlimited).
    
    Returns:
        dict: {
            "success": bool,
            "sunrise": str,
            "sunset": str,
            "golden_hour_morning": str,
            "golden_hour_evening": str
        }
    """
    url = "https://api.sunrise-sunset.org/json"
    params = {
        "lat": lat,
        "lng": lng,
        "formatted": 1 # Human readable times (e.g. "5:47:12 AM")
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "OK":
                results = data.get("results", {})
                
                # Format a friendly golden hour string (dawn to shortly after sunrise, shortly before sunset to dusk)
                sunrise = results.get("sunrise", "6:00:00 AM")
                sunset = results.get("sunset", "6:00:00 PM")
                
                # Simple parsing of seconds removal for cleaner display
                clean_sunrise = ":".join(sunrise.split(":")[:2]) + " " + sunrise.split(" ")[-1]
                clean_sunset = ":".join(sunset.split(":")[:2]) + " " + sunset.split(" ")[-1]
                
                # Approximate golden hours (roughly 30-40 min bracket)
                gh_morning = f"{clean_sunrise} - {clean_sunrise.replace('AM', '')}" # e.g. 5:47 AM - 6:30 AM
                logger.info(f"Loaded sun times for {lat}, {lng}: Sunrise={clean_sunrise}, Sunset={clean_sunset}")
                
                return {
                    "success": True,
                    "sunrise": clean_sunrise,
                    "sunset": clean_sunset,
                    "golden_hour_morning": f"Approx. {clean_sunrise} to 45 mins after",
                    "golden_hour_evening": f"Approx. 45 mins before {clean_sunset} to sunset"
                }
    except Exception as e:
        logger.error(f"Error fetching sunrise/sunset timings: {e}")

    # Safe default fallbacks
    return {
        "success": False,
        "sunrise": "6:00 AM",
        "sunset": "6:00 PM",
        "golden_hour_morning": "05:30 AM - 06:15 AM",
        "golden_hour_evening": "05:30 PM - 06:15 PM",
        "error": "Timing API failed. Defaulted to standard estimates."
    }
