from tavily import TavilyClient
import os
from dotenv import load_dotenv

load_dotenv()

client = TavilyClient(
    api_key=os.getenv("TAVILY_API_KEY")
)


def tavily_search(query: str, include_images: bool = True):
    """
    Search using Tavily API.
    Returns a dictionary containing:
    - 'text': Formatted markdown of search results
    - 'images': List of image dictionaries/URLs found
    - 'booking_links': List of booking-related URLs extracted from results
    """
    response = client.search(
        query=query,
        max_results=5,
        include_images=include_images
    )

    results = []
    booking_links = []

    for i, r in enumerate(response.get("results", []), 1):
        title = r.get("title", "Unknown")
        url = r.get("url", "")
        snippet = r.get("content", "").strip()
        # Keep only the first 300 characters to avoid wall-of-text
        if len(snippet) > 300:
            snippet = snippet[:300].rsplit(" ", 1)[0] + "..."

        results.append(f"{i}. **{title}**\n   {url}\n   {snippet}")

        # Parse hotel booking sites
        url_lower = url.lower()
        if any(domain in url_lower for domain in ["booking.com", "agoda.com", "hotels.com", "expedia.com", "tripadvisor.com", "airbnb.com"]):
            booking_links.append({
                "title": f"Book/View: {title}",
                "url": url,
                "type": "hotel"
            })

    formatted_text = "\n\n".join(results)

    # Extract images from response (Tavily include_images returns a list of URLs or image dicts)
    raw_images = response.get("images", [])
    images = []
    for img in raw_images:
        if isinstance(img, str):
            images.append({
                "url": img,
                "alt": f"Image of {query}",
                "credit": "Tavily Search"
            })
        elif isinstance(img, dict) and img.get("url"):
            images.append({
                "url": img["url"],
                "alt": img.get("description") or f"Image of {query}",
                "credit": "Tavily Search"
            })

    return {
        "text": formatted_text,
        "images": images,
        "booking_links": booking_links
    }