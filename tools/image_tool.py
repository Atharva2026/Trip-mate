import os
import requests
import logging

logger = logging.getLogger("tripmate.image_tool")

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")


def fetch_unsplash_images(destination: str, count: int = 4) -> list[dict]:
    """
    Fetch images for a destination using Unsplash API.
    Returns:
        list of dict: [{"url": str, "alt": str, "credit": str, "credit_url": str}]
    """
    if not UNSPLASH_ACCESS_KEY:
        logger.warning("UNSPLASH_ACCESS_KEY is missing in environment variables. Skipping Unsplash.")
        return []

    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": destination,
        "per_page": count,
        "orientation": "landscape",
        "client_id": UNSPLASH_ACCESS_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            images = []
            for item in data.get("results", []):
                urls = item.get("urls", {})
                user = item.get("user", {})
                images.append({
                    "url": urls.get("regular") or urls.get("small") or "",
                    "alt": item.get("alt_description") or f"Photo of {destination}",
                    "credit": f"Photo by {user.get('name', 'Unsplash')}",
                    "credit_url": user.get("links", {}).get("html", "https://unsplash.com")
                })
            logger.info(f"Successfully fetched {len(images)} images from Unsplash for '{destination}'")
            return images
        else:
            logger.warning(f"Unsplash API returned status code {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Error fetching images from Unsplash: {e}")
        return []
