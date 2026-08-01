import requests
import logging

logger = logging.getLogger("tripmate.wikipedia_tool")

def fetch_wikipedia_summary(destination: str) -> str:
    """
    Search Wikipedia for the destination and retrieve a short summary (first 2-3 paragraphs).
    Returns clean text. If anything fails, returns empty string.
    """
    if not destination:
        return ""

    search_url = "https://en.wikipedia.org/w/api.php"
    search_params = {
        "action": "query",
        "list": "search",
        "srsearch": destination,
        "format": "json",
        "srlimit": 1
    }

    try:
        response = requests.get(search_url, params=search_params, timeout=5)
        if response.status_code != 200:
            logger.warning(f"Wikipedia search returned status code {response.status_code}")
            return ""
        
        data = response.json()
        search_results = data.get("query", {}).get("search", [])
        if not search_results:
            logger.info(f"No Wikipedia page found for '{destination}'")
            return ""
        
        title = search_results[0].get("title")
        if not title:
            return ""

        query_params = {
            "action": "query",
            "prop": "extracts",
            "exintro": 1,
            "explaintext": 1,
            "titles": title,
            "format": "json"
        }
        
        query_response = requests.get(search_url, params=query_params, timeout=5)
        if query_response.status_code == 200:
            query_data = query_response.json()
            pages = query_data.get("query", {}).get("pages", {})
            for page_id, page_info in pages.items():
                extract = page_info.get("extract", "")
                if extract:
                    # Limit to 3 paragraphs or first 800 characters to keep context small
                    paragraphs = [p.strip() for p in extract.split("\n") if p.strip()]
                    summary = "\n\n".join(paragraphs[:3])
                    if len(summary) > 800:
                        summary = summary[:800] + "..."
                    logger.info(f"Successfully retrieved Wikipedia summary for '{title}'")
                    return summary
        
        return ""
    except Exception as e:
        logger.error(f"Error fetching Wikipedia page for '{destination}': {e}")
        return ""
