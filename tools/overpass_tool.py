import requests
import logging

logger = logging.getLogger("tripmate.overpass_tool")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def _query_overpass(query_str: str) -> dict:
    """Helper to query Overpass API safely with timeout."""
    try:
        headers = {
            "User-Agent": "TripMateTravelPlanner/2.0 (contact: support@tripmate.com)"
        }
        response = requests.post(OVERPASS_URL, data={"data": query_str}, headers=headers, timeout=8)
        if response.status_code == 200:
            return response.json()
        else:
            logger.warning(f"Overpass API returned status code {response.status_code}")
            return {}
    except Exception as e:
        logger.error(f"Error querying Overpass API: {e}")
        return {}

def fetch_restaurants_near(lat: float, lng: float, radius_m: int = 5000, limit: int = 15) -> list[dict]:
    """
    Fetch restaurants and cafes near coordinates using Overpass API.
    Returns:
        list of dict: [{"name": str, "lat": float, "lng": float, "cuisine": str, "opening_hours": str}]
    """
    query = f"""[out:json][timeout:8];
    (
      node["amenity"="restaurant"](around:{radius_m},{lat},{lng});
      node["amenity"="cafe"](around:{radius_m},{lat},{lng});
    );
    out {limit};"""
    
    data = _query_overpass(query)
    elements = data.get("elements", [])
    results = []
    
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
            
        results.append({
            "name": name,
            "lat": el.get("lat"),
            "lng": el.get("lon"),
            "cuisine": tags.get("cuisine", "local"),
            "opening_hours": tags.get("opening_hours", "not specified"),
            "website": tags.get("website", "")
        })
        
    logger.info(f"Overpass fetched {len(results)} eateries near {lat}, {lng}")
    return results

def fetch_facilities_near(lat: float, lng: float, radius_m: int = 5000, limit: int = 30) -> list[dict]:
    """
    Fetch hospitals, restrooms, and ATMs near coordinates using Overpass API.
    Returns:
        list of dict: [{"type": str, "name": str, "lat": float, "lng": float}]
    """
    query = f"""[out:json][timeout:8];
    (
      node["amenity"="hospital"](around:{radius_m},{lat},{lng});
      node["amenity"="toilets"](around:{radius_m},{lat},{lng});
      node["amenity"="atm"](around:{radius_m},{lat},{lng});
    );
    out {limit};"""
    
    data = _query_overpass(query)
    elements = data.get("elements", [])
    results = []
    
    for el in elements:
        tags = el.get("tags", {})
        amenity = tags.get("amenity", "facility")
        
        # Determine name fallback if not specified
        name = tags.get("name")
        if not name:
            if amenity == "hospital":
                name = "Medical Clinic / Hospital"
            elif amenity == "toilets":
                name = "Public Restroom"
            elif amenity == "atm":
                name = "ATM Cash Machine"
            else:
                name = "Local Facility"
                
        results.append({
            "type": amenity,
            "name": name,
            "lat": el.get("lat"),
            "lng": el.get("lon")
        })
        
    logger.info(f"Overpass fetched {len(results)} safety/convenience facilities near {lat}, {lng}")
    return results
