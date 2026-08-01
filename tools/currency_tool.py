import requests
import logging

logger = logging.getLogger("tripmate.currency_tool")

def fetch_exchange_rate(from_currency: str = "USD", to_currency: str = "INR") -> dict:
    """
    Fetch the exchange rate between two currencies using open.er-api.com (zero keys needed).
    Returns a dict containing:
        - "rate": float
        - "success": bool
        - "from": str
        - "to": str
    """
    from_currency = from_currency.upper().strip()
    to_currency = to_currency.upper().strip()

    if from_currency == to_currency:
        return {"rate": 1.0, "success": True, "from": from_currency, "to": to_currency}

    url = f"https://open.er-api.com/v6/latest/{from_currency}"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            rates = data.get("rates", {})
            rate = rates.get(to_currency)
            if rate is not None:
                logger.info(f"Exchange rate loaded: 1 {from_currency} = {rate} {to_currency}")
                return {
                    "rate": float(rate),
                    "success": True,
                    "from": from_currency,
                    "to": to_currency,
                    "rates": rates
                }
            else:
                logger.warning(f"Currency code '{to_currency}' not found in exchange rates.")
        else:
            logger.warning(f"Currency API returned status code {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching exchange rate from {from_currency} to {to_currency}: {e}")

    # Safe fallback
    return {
        "rate": 1.0,
        "success": False,
        "from": from_currency,
        "to": to_currency,
        "rates": {"USD": 1.0, "INR": 83.5, "BDT": 117.0, "EUR": 0.92, "JPY": 160.0, "AED": 3.67},
        "error": "Exchange rate server unreachable. Defaulted to 1.0 conversion."
    }
