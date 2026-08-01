import math
import logging

logger = logging.getLogger("tripmate.route_tool")

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    # Earth radius in kilometers
    R = 6371.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def optimize_stop_sequence(stops: list[dict]) -> tuple[list[dict], dict]:
    """
    Optimizes the sequence of stops using a lightweight nearest-neighbor heuristic.
    
    Args:
        stops: list of dict [{"name": str, "lat": float, "lng": float, ...}]
        
    Returns:
        tuple (optimized_stops_list, metrics_dict)
    """
    if len(stops) <= 2:
        # No optimization needed/possible for 0, 1, or 2 stops
        return stops, {
            "time_saved_minutes": 0,
            "original_distance_km": 0.0,
            "optimized_distance_km": 0.0
        }
        
    # Calculate original total sequential distance
    original_dist = 0.0
    for i in range(len(stops) - 1):
        original_dist += haversine_distance(
            stops[i]["lat"], stops[i]["lng"],
            stops[i+1]["lat"], stops[i+1]["lng"]
        )
        
    # Nearest-neighbor heuristic pathfinding
    unvisited = list(stops)
    optimized_stops = []
    
    # Start with the first stop specified by the user/planner
    current = unvisited.pop(0)
    optimized_stops.append(current)
    
    optimized_dist = 0.0
    while unvisited:
        nearest_idx = 0
        min_dist = float('inf')
        
        for idx, candidate in enumerate(unvisited):
            dist = haversine_distance(
                current["lat"], current["lng"],
                candidate["lat"], candidate["lng"]
            )
            if dist < min_dist:
                min_dist = dist
                nearest_idx = idx
                
        current = unvisited.pop(nearest_idx)
        optimized_dist += min_dist
        optimized_stops.append(current)
        
    # Estimate time savings (assuming avg urban driving/transit speed of 30 km/h)
    dist_saved = max(0.0, original_dist - optimized_dist)
    time_saved_hours = dist_saved / 30.0
    time_saved_minutes = int(round(time_saved_hours * 60))
    
    metrics = {
        "time_saved_minutes": time_saved_minutes,
        "original_distance_km": round(original_dist, 2),
        "optimized_distance_km": round(optimized_dist, 2)
    }
    
    logger.info(f"Route sequence optimized: saved {dist_saved:.2f} km (~{time_saved_minutes} min transit time)")
    return optimized_stops, metrics
