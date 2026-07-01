import requests
import logging

logger = logging.getLogger("tripmate.geocode_tool")


def geocode_location(location_name: str) -> dict:
    """
    Geocode a location name using Nominatim OpenStreetMap (zero key required).
    Returns a dictionary with:
    - 'success': bool
    - 'name': str
    - 'lat': float
    - 'lng': float
    - 'display_name': str
    """
    if not location_name:
        return {"success": False, "error": "No location specified"}

    url = "https://nominatim.openstreetmap.org/search"
    # OpenStreetMap Nominatim requires a user-agent to identify the request
    headers = {
        "User-Agent": "TripMateAI/1.0 (atharvashah projects/TripMate)"
    }
    params = {
        "q": location_name,
        "format": "json",
        "limit": 1
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data:
                item = data[0]
                return {
                    "success": True,
                    "name": location_name,
                    "lat": float(item["lat"]),
                    "lng": float(item["lon"]),
                    "display_name": item.get("display_name", "")
                }
            else:
                return {"success": False, "error": f"No geocoding results found for '{location_name}'"}
        else:
            return {"success": False, "error": f"Nominatim API returned status code {response.status_code}"}
    except Exception as e:
        logger.error(f"Error geocoding location '{location_name}': {e}")
        return {"success": False, "error": str(e)}
