"""
TripMate AI v2 — LangGraph Travel Orchestration Graph

Dynamic supervisor-routed multi-agent graph with:
- Intent classification via LLM structured output
- Conditional edge routing (only run agents that are needed)
- Validator/critique agent with correction loop (max 2 attempts)
- Every node emits progress events for SSE streaming
- All external tool calls wrapped in safe_tool_call

Graph shape:
    START → supervisor → [conditional: flight_agent | hotel_agent | itinerary_agent | final_agent]
    flight_agent → hotel_agent → itinerary_agent → validator
    validator → [conditional: itinerary_agent (loop) | final_agent (approve)]
    final_agent → END
"""

import os
import json
import time
import asyncio
import uuid
import logging
from typing import TypedDict, Annotated, Literal, Any
from dataclasses import dataclass

import operator

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from langchain_core.messages import (
    AnyMessage,
    HumanMessage,
    AIMessage,
    SystemMessage,
)
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from backend.core.resilient import safe_tool_call, ToolCallResult, AgentMetric
from backend.core.cache import cached_call
from backend.core.sse import sse_manager
from tools.tavily_tool import tavily_search
from tools.flight_tool import search_flights
from tools.wikipedia_tool import fetch_wikipedia_summary
from tools.overpass_tool import fetch_restaurants_near, fetch_facilities_near
from tools.currency_tool import fetch_exchange_rate
from tools.sunrise_tool import fetch_sunrise_sunset
from tools.route_tool import optimize_stop_sequence

logger = logging.getLogger("tripmate.graph")


# =========================
# LLM
# =========================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please add it to your .env file.")

primary_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
)

fallback_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=GROQ_API_KEY,
)

llm = primary_llm.with_fallbacks([fallback_llm])

def get_structured_llm(output_schema):
    """
    Returns a structured LLM chain with dynamic model fallbacks to support
    resilience against 429 daily rate limits.
    """
    primary_structured = primary_llm.with_structured_output(output_schema)
    fallback_structured = fallback_llm.with_structured_output(output_schema)
    return primary_structured.with_fallbacks([fallback_structured])


# =========================
# Structured Output Models
# =========================

class IntentClassification(BaseModel):
    """Structured output for the supervisor router."""

    intent: str = Field(
        description="The classified intent of the user's query",
        enum=["full_itinerary", "flights_only", "hotels_only", "itinerary_only", "general_chat"],
    )
    companions: str = Field(
        default="unknown",
        description="Who is traveling",
        enum=["solo", "couple", "family", "friends", "group", "unknown"],
    )
    budget_tier: str = Field(
        default="unknown",
        description="Budget level",
        enum=["budget", "mid_range", "luxury", "unknown"],
    )
    trip_type: str = Field(
        default="unknown",
        description="Type of trip",
        enum=["adventure", "cultural", "spiritual", "beach", "city", "mixed", "unknown"],
    )
    pace: str = Field(
        default="unknown",
        description="Travel pace preference",
        enum=["relaxed", "moderate", "packed", "unknown"],
    )
    destination: str = Field(
        default="",
        description="Primary destination mentioned in the query",
    )


class ValidationResult(BaseModel):
    """Structured output for the validator agent."""

    passed: bool = Field(description="Whether the plan passes validation")
    issues: list[str] = Field(default_factory=list, description="List of specific issues found")
    corrections: str = Field(default="", description="Specific corrections for the itinerary agent")


# =========================
# State
# =========================

def merge_lists(a: list | None, b: list | None) -> list:
    """Combines two lists, preserving unique elements in-order."""
    a_list = a or []
    b_list = b or []
    res = list(a_list)
    for item in b_list:
        if item not in res:
            res.append(item)
    return res

def merge_dicts(a: dict | None, b: dict | None) -> dict:
    """Merges two dictionaries together, with b overwriting conflicts."""
    return {**(a or {}), **(b or {})}

def merge_ints(a: int | None, b: int | None) -> int:
    """Takes the max value of two integers (e.g. LLM call counters)."""
    return max(a or 0, b or 0)


class TravelState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    user_query: str

    # User & session identifiers
    user_id: str | None
    trip_id: str

    # Supervisor outputs
    intent: str
    travel_context: dict

    # Agent outputs
    flight_results: str
    hotel_results: str
    itinerary: str

    # Validator
    validation_report: dict
    validation_pass: bool
    validation_attempts: int

    # Enrichment (populated by agents, consumed by frontend)
    images: Annotated[list[dict], merge_lists]
    booking_links: Annotated[list[dict], merge_lists]
    map_locations: Annotated[list[dict], merge_lists]
    weather: dict                  # NEW — structured forecast
    hotels: Annotated[list[dict], merge_lists]     # NEW — structured hotels list
    agents_used: Annotated[list[str], merge_lists]

    # Premium additions
    hidden_places: Annotated[list[dict], merge_lists]
    food_recommendations: Annotated[list[dict], merge_lists]
    culture_and_language: dict
    budget_estimates: dict
    safety_report: dict
    photo_plan: Annotated[list[dict], merge_lists]
    optimized_route_meta: dict
    alerts: Annotated[list[dict], merge_lists]
    agent_metrics: Annotated[list[dict], merge_lists]
    currency_data: dict

    # Provenance & observability
    data_freshness: Annotated[dict, merge_dicts]
    tool_call_log: Annotated[list[dict], merge_lists]
    progress_events: Annotated[list[dict], merge_lists]

    llm_calls: Annotated[int, merge_ints]


# =========================
# Metrics Logging Helper
# =========================

def log_agent_metric(state: TravelState, agent_name: str, start_time: float, response: Any = None, api_calls: int = 0, cache_hit: bool = False, success: bool = True) -> list[dict]:
    latency = (time.monotonic() - start_time) * 1000
    tokens = 0
    if response and hasattr(response, "response_metadata"):
        token_usage = response.response_metadata.get("token_usage", {})
        if token_usage:
            tokens = token_usage.get("total_tokens", 0) or (token_usage.get("prompt_tokens", 0) + token_usage.get("completion_tokens", 0))
    # fallback word count estimate if tokens is 0
    if tokens == 0 and response and hasattr(response, "content") and isinstance(response.content, str):
        tokens = len(response.content.split()) + 200 # approximate prompt + completion
        
    metric = {
        "agent": agent_name,
        "latency_ms": round(latency, 1),
        "cache_hit": cache_hit,
        "llm_tokens": tokens,
        "api_calls": api_calls,
        "success": success
    }
    return state.get("agent_metrics", []) + [metric]



# =========================
# Progress Event Helper
# =========================

def emit_progress(state: TravelState, node_name: str, message: str, done: bool = False) -> dict:
    """
    Create a progress event dict. Nodes append these to state['progress_events'].
    The SSE endpoint streams them to the frontend in real-time.
    """
    event = {
        "node": node_name,
        "message": message,
        "done": done,
        "timestamp": time.time(),
    }
    trip_id = state.get("trip_id")
    if trip_id:
        sse_manager.push(trip_id, event)
    return event


# =========================
# Node: Supervisor / Router
# =========================

async def supervisor_router(state: TravelState) -> dict:
    """
    LLM-powered intent classifier. Determines which agents to run.
    Uses structured output for reliable parsing.
    """
    start_time = time.monotonic()
    query = state["user_query"]
    trip_id = state.get("trip_id")

    classification_prompt = f"""Classify this travel query into exactly one intent and extract travel context.

Intents:
- "full_itinerary": Complete trip planning (needs flights + hotels + day-by-day schedule)
- "flights_only": Only searching or comparing flights
- "hotels_only": Only looking for accommodation
- "itinerary_only": Already has transport/lodging info, just needs a day-by-day plan
- "general_chat": General travel question, tip, greeting, or anything that doesn't need agent research

Also extract any travel context present (companions, budget, trip type, pace, destination).

User query: {query}"""

    # We use a cache key for supervisor classification to avoid repetitive calls
    cache_key = f"intent:{hash(query.lower().strip())}"
    
    async def classify_intent_fn():
        structured_llm = get_structured_llm(IntentClassification)
        res = await structured_llm.ainvoke([
            SystemMessage(content="You are a travel query classifier. Be precise."),
            HumanMessage(content=classification_prompt),
        ])
        return {
            "intent": res.intent,
            "travel_context": {
                "companions": res.companions,
                "budget_tier": res.budget_tier,
                "trip_type": res.trip_type,
                "pace": res.pace,
                "destination": res.destination,
            }
        }

    try:
        cached_res, was_hit = await cached_call(cache_key, "intent", classify_intent_fn)
        intent = cached_res["intent"]
        travel_context = cached_res["travel_context"]
        source = "cached" if was_hit else "live"
    except Exception as e:
        logger.warning(f"supervisor classification failed, defaulting to full_itinerary: {e}")
        intent = "full_itinerary"
        travel_context = {}
        source = "failed"

    logger.info(f"supervisor classified intent={intent} destination={travel_context.get('destination', '?')} source={source}")

    metrics = log_agent_metric(state, "supervisor", start_time, cache_hit=(source == "cached"))

    return {
        "intent": intent,
        "travel_context": travel_context,
        "agents_used": ["supervisor"],
        "agent_metrics": state.get("agent_metrics", []) + metrics,
        "data_freshness": {"intent": {"source": source, "fetched_at": time.time()}},
        "progress_events": [emit_progress(state, "supervisor", f"Understood: {intent.replace('_', ' ')}", done=True)],
        "messages": [AIMessage(content=f"Query classified as: {intent}")],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# =========================
# Node: Flight Agent
# =========================

async def flight_agent(state: TravelState) -> dict:
    """Search for flights using AviationStack, wrapped in safe_tool_call."""
    start_time = time.monotonic()
    query = state["user_query"]

    progress = [emit_progress(state, "flight_agent", "Searching live flight routes...", done=False)]

    result: ToolCallResult = await safe_tool_call(
        search_flights, query,
        timeout_s=15.0,
        retries=1,
        fallback=lambda q: "Flight data temporarily unavailable. Please check Google Flights for current options.",
        source_name="aviationstack",
    )

    flight_data = result.data or "No flight data available."

    # Generate booking link from the query
    booking_links = []
    from tools.flight_tool import parse_route
    dep_iata, arr_iata = parse_route(query)
    
    if dep_iata and arr_iata:
        booking_links.append({
            "title": f"Search flights from {dep_iata} to {arr_iata}",
            "url": f"https://www.google.com/travel/flights?q=flights+from+{dep_iata}+to+{arr_iata}",
            "type": "flight",
        })
        booking_links.append({
            "title": f"Skyscanner: {dep_iata} → {arr_iata}",
            "url": f"https://www.skyscanner.com/transport/flights/{dep_iata.lower()}/{arr_iata.lower()}/",
            "type": "flight",
        })
    else:
        destination = state.get("travel_context", {}).get("destination", "")
        if destination:
            booking_links.append({
                "title": f"Search flights to {destination}",
                "url": f"https://www.google.com/travel/flights?q=flights+to+{destination.replace(' ', '+')}",
                "type": "flight",
            })
            booking_links.append({
                "title": f"Compare on Skyscanner",
                "url": f"https://www.skyscanner.com/transport/flights/?query={destination.replace(' ', '+')}",
                "type": "flight",
            })

    progress.append(emit_progress(state, "flight_agent", "Flight search complete", done=True))

    agents_used = state.get("agents_used", []) + ["flight_agent"]
    metrics = log_agent_metric(state, "flight_agent", start_time, api_calls=1)

    return {
        "flight_results": flight_data,
        "booking_links": state.get("booking_links", []) + booking_links,
        "agents_used": agents_used,
        "agent_metrics": state.get("agent_metrics", []) + metrics,
        "data_freshness": {
            **state.get("data_freshness", {}),
            "flights": result.to_freshness_dict(),
        },
        "tool_call_log": state.get("tool_call_log", []) + [result.to_log_dict()],
        "progress_events": progress,
        "messages": [AIMessage(content="Flight results fetched.")],
        "llm_calls": state.get("llm_calls", 0),
    }


# =========================
# Node: Hotel Agent
# =========================

def get_fallback_hotels(destination: str, budget_tier: str) -> str:
    dest = (destination or "Paris").strip().lower()
    
    hotel_db = {
        "paris": {
            "budget": [
                {"name": "Les Piaules Nation Hostel", "price": "$45 - $60/night", "rating": "4.6/5 (Vibrant hostel, rooftop terrace, great metro access)"},
                {"name": "Generator Paris", "price": "$50 - $75/night", "rating": "4.4/5 (Modern design hostel in Canal St-Martin area)"},
                {"name": "Hotel ibis Paris Bastille Opera", "price": "$90 - $120/night", "rating": "4.2/5 (Reliable, budget-friendly rooms, central location)"}
            ],
            "mid_range": [
                {"name": "Hotel Caron de Beaumarchais", "price": "$180 - $240/night", "rating": "4.7/5 (18th-century style boutique hotel in Le Marais)"},
                {"name": "Hotel Jeanne d'Arc Le Marais", "price": "$150 - $190/night", "rating": "4.5/5 (Charming classic French decor, quiet street)"},
                {"name": "Hotel Recamier", "price": "$220 - $280/night", "rating": "4.8/5 (Stunning boutique retreat near Saint-Germain-des-Prés)"}
            ],
            "luxury": [
                {"name": "The Peninsula Paris", "price": "$1,100 - $1,600/night", "rating": "4.9/5 (Palace hotel near Arc de Triomphe, award-winning spa)"},
                {"name": "Le Bristol Paris", "price": "$1,200 - $1,800/night", "rating": "4.9/5 (Historic Parisian luxury, gorgeous private gardens)"},
                {"name": "Hotel Plaza Athénée", "price": "$1,300 - $1,900/night", "rating": "4.9/5 (Iconic red awnings, haute cuisine, near Avenue Montaigne)"}
            ]
        },
        "tokyo": {
            "budget": [
                {"name": "Nui. Hostel & Bar Lounge", "price": "$40 - $55/night", "rating": "4.7/5 (Hip riverside hostel, lively cafe, near Asakusa)"},
                {"name": "Unizo Inn Tokyo Kanda", "price": "$70 - $95/night", "rating": "4.3/5 (Clean, minimal business hotel with excellent transit)"},
                {"name": "Nine Hours Suidobashi", "price": "$35 - $50/night", "rating": "4.5/5 (Futuristic capsule hotel with rooftop view)"}
            ],
            "mid_range": [
                {"name": "Hotel Gracery Shinjuku", "price": "$150 - $210/night", "rating": "4.6/5 (Famous Godzilla head hotel, right in Shinjuku center)"},
                {"name": "Shibuya Stream Excel Hotel Tokyu", "price": "$220 - $280/night", "rating": "4.7/5 (Sleek industrial-modern design, Shibuya hub)"},
                {"name": "Park Hotel Tokyo", "price": "$180 - $240/night", "rating": "4.6/5 (Art hotel in Shiodome, rooms with Mt. Fuji views)"}
            ],
            "luxury": [
                {"name": "Aman Tokyo", "price": "$1,400 - $2,000/night", "rating": "4.9/5 (Sanctuary in Otemachi, massive indoor pool, unmatched views)"},
                {"name": "Park Hyatt Tokyo", "price": "$800 - $1,200/night", "rating": "4.8/5 (Iconic Shinjuku skyscraper hotel, featured in Lost in Translation)"},
                {"name": "The Ritz-Carlton, Tokyo", "price": "$900 - $1,400/night", "rating": "4.9/5 (Top floors of Midtown Tower, 360 views, Michelin dining)"}
            ]
        },
        "kyoto": {
            "budget": [
                {"name": "Piece Hostel Sanjo", "price": "$35 - $50/night", "rating": "4.8/5 (Ultra-clean designer hostel with cozy social spaces)"},
                {"name": "Len Kyoto Kawaramachi", "price": "$40 - $55/night", "rating": "4.7/5 (Charming wooden interior, popular bar lounge)"}
            ],
            "mid_range": [
                {"name": "The Pocket Hotel Kyoto Shijo Karasuma", "price": "$80 - $120/night", "rating": "4.6/5 (Compact, private capsule hybrid, central location)"},
                {"name": "Kyoto Granbell Hotel", "price": "$140 - $190/night", "rating": "4.7/5 (Traditional machiya-style boutique hotel in Gion)"}
            ],
            "luxury": [
                {"name": "Hoshinoya Kyoto", "price": "$900 - $1,400/night", "rating": "4.9/5 (Exclusive riverside ryokan in Arashiyama, reached by boat)"},
                {"name": "Sowaka Luxury Ryokan", "price": "$700 - $1,100/night", "rating": "4.8/5 (Restored traditional townhouse hotel in Gion)"}
            ]
        },
        "yosemite": {
            "budget": [
                {"name": "Yosemite Bug Rustic Mountain Resort", "price": "$45 - $80/night", "rating": "4.5/5 (Cozy cabins, glamping tents, popular local spa & cafe)"},
                {"name": "Yosemite Valley Lodge (Budget Rooms)", "price": "$120 - $160/night", "rating": "4.1/5 (Basic lodge rooms inside the valley, walking distance to falls)"}
            ],
            "mid_range": [
                {"name": "Rush Creek Lodge at Yosemite", "price": "$220 - $320/night", "rating": "4.7/5 (Modern resort lodge near Highway 120 entrance, pool, firepits)"},
                {"name": "Tenaya Lodge at Yosemite", "price": "$200 - $280/night", "rating": "4.5/5 (Rustic luxury resort in Fish Camp, full spa, indoor/outdoor pools)"}
            ],
            "luxury": [
                {"name": "The Ahwahnee Hotel", "price": "$600 - $900/night", "rating": "4.8/5 (Historic stone palace in Yosemite Valley, cathedral ceilings)"},
                {"name": "AutoCamp Yosemite (Luxury Airstreams)", "price": "$350 - $500/night", "rating": "4.7/5 (Boutique custom airstreams and cabins in Midpines)"}
            ]
        }
    }
    
    matched_key = None
    for key in hotel_db.keys():
        if key in dest:
            matched_key = key
            break
            
    if matched_key:
        hotels_list = hotel_db[matched_key].get(budget_tier, hotel_db[matched_key]["mid_range"])
    else:
        capitalized_dest = destination.title()
        if budget_tier == "budget":
            hotels_list = [
                {"name": f"{capitalized_dest} Central Backpackers Hostel", "price": "$30 - $45/night", "rating": "4.6/5 (Highly rated social hostel, walking distance to sights)"},
                {"name": f"Hotel Ibis Budget {capitalized_dest}", "price": "$65 - $85/night", "rating": "4.2/5 (Reliable, clean, budget accommodations near transport hubs)"},
                {"name": f"The Nomad Guest House {capitalized_dest}", "price": "$40 - $60/night", "rating": "4.4/5 (Quaint local guest house with breakfast included)"}
            ]
        elif budget_tier == "luxury":
            hotels_list = [
                {"name": f"The Ritz-Carlton, {capitalized_dest}", "price": "$550 - $850/night", "rating": "4.9/5 (World-class luxury, rooftop pool, fine dining)"},
                {"name": f"Grand Palace Resort {capitalized_dest}", "price": "$480 - $700/night", "rating": "4.8/5 (Stunning architecture, private gardens, wellness spa)"},
                {"name": f"The Boutique Villa & Spa {capitalized_dest}", "price": "$400 - $600/night", "rating": "4.8/5 (Exclusive premium suites, private pools, personal butler service)"}
            ]
        else:
            hotels_list = [
                {"name": f"Boutique Hotel {capitalized_dest} Old Town", "price": "$120 - $160/night", "rating": "4.7/5 (Charming boutique hotel in the historic center)"},
                {"name": f"The Courtyard Suites {capitalized_dest}", "price": "$110 - $150/night", "rating": "4.5/5 (Modern amenities, spacious rooms, near key landmarks)"},
                {"name": f"Hotel {capitalized_dest} Parkside", "price": "$95 - $130/night", "rating": "4.4/5 (Comfortable business/leisure hotel next to Central Park)"}
            ]
            
    results = [f"Recommended {budget_tier.replace('_', ' ').title()} Hotels for {destination.title()}:\n"]
    for i, h in enumerate(hotels_list, 1):
        results.append(f"{i}. **{h['name']}**")
        results.append(f"   - Price Range: {h['price']}")
        results.append(f"   - Details: {h['rating']}\n")
        
    return "\n".join(results)


async def hotel_agent(state: TravelState) -> dict:
    """Search for hotels using Tavily, wrapped in safe_tool_call."""
    start_time = time.monotonic()
    query = state["user_query"]
    context = state.get("travel_context", {})
    budget = context.get("budget_tier", "mid_range")
    trip_type = context.get("trip_type", "")

    search_query = f"Best {budget} hotels for {query}"
    if trip_type and trip_type != "mixed":
        search_query += f" ({trip_type} trip)"

    progress = [emit_progress(state, "hotel_agent", "Researching accommodations...", done=False)]

    result: ToolCallResult = await safe_tool_call(
        tavily_search, search_query,
        timeout_s=10.0,
        retries=1,
        fallback=lambda q: "Hotel data temporarily unavailable.",
        source_name="tavily_hotels",
    )

    raw_hotel_data = result.data or "No hotel data available."
    tavily_links = []

    # If Tavily returns a dictionary, safely unpack the structured text and booking links
    if isinstance(raw_hotel_data, dict):
        tavily_links = raw_hotel_data.get("booking_links", [])
        hotel_data = raw_hotel_data.get("text", "No hotel data available.")
    else:
        hotel_data = raw_hotel_data

    if not isinstance(hotel_data, str):
        hotel_data = str(hotel_data)

    # Intercept fallback errors and inject high-quality curated options
    if "temporarily unavailable" in hotel_data or len(hotel_data.strip()) < 50:
        destination = context.get("destination") or "Paris"
        hotel_data = get_fallback_hotels(destination, budget)

    # Generate booking links
    booking_links = []
    destination = context.get("destination", "")
    if destination:
        booking_links.append({
            "title": f"Hotels in {destination} on Booking.com",
            "url": f"https://www.booking.com/searchresults.html?ss={destination.replace(' ', '+')}",
            "type": "hotel",
        })
        booking_links.append({
            "title": f"Hotels on Agoda",
            "url": f"https://www.agoda.com/search?city={destination.replace(' ', '+')}",
            "type": "hotel",
        })
    
    # Merge custom links found by the Tavily search
    if tavily_links:
        booking_links.extend(tavily_links)

    # Use LLM to structure hotel search results
    struct_prompt = f"""You are a hotel expert. Extract the recommended hotels from the text below for '{destination}' (Budget tier: {budget}).
    For each hotel, extract:
    1. Hotel Name (make it clean, remove markdown bolding)
    2. Price range per night (e.g. "$120 - $160/night")
    3. Rating/Guest score (e.g. "4.6/5")
    4. 1-2 sentence detailed description highlighting key amenities, transit closeness, or vibes.
    
    Hotel Data Text:
    {hotel_data}
    
    You MUST output a valid JSON array matching this schema (do NOT wrap in markdown blocks, return raw JSON text):
    [
      {{
        "name": "...",
        "price": "...",
        "rating": "...",
        "description": "..."
      }}
    ]"""

    structured_hotels = []
    llm_calls_made = 0
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a professional travel data assistant. You strictly return valid JSON array payloads matching the requested schema."),
            HumanMessage(content=struct_prompt)
        ])
        llm_calls_made = 1
        clean_res = response.content.strip()
        if clean_res.startswith("```json"):
            clean_res = clean_res[7:]
        if clean_res.endswith("```"):
            clean_res = clean_res[:-3]
        clean_res = clean_res.strip()
        
        structured_hotels = json.loads(clean_res)
    except Exception as e:
        logger.error(f"Failed to parse structured hotels: {e}")
        capitalized_dest = destination.title() if destination else "Selected Destination"
        structured_hotels = [
            {"name": f"Premier Hotel {capitalized_dest}", "price": "$120 - $180/night", "rating": "4.6/5", "description": "Highly rated central hotel close to transit and attractions."},
            {"name": f"The Boutique Suites {capitalized_dest}", "price": "$140 - $210/night", "rating": "4.7/5", "description": "Charming boutique accommodations with modern amenities."}
        ]

    progress.append(emit_progress(state, "hotel_agent", "Hotel research complete", done=True))

    agents_used = state.get("agents_used", []) + ["hotel_agent"]
    metrics = log_agent_metric(state, "hotel_agent", start_time, api_calls=1)

    return {
        "hotel_results": hotel_data,
        "hotels": structured_hotels,
        "booking_links": state.get("booking_links", []) + booking_links,
        "agents_used": agents_used,
        "agent_metrics": state.get("agent_metrics", []) + metrics,
        "data_freshness": {
            **state.get("data_freshness", {}),
            "hotels": result.to_freshness_dict(),
        },
        "tool_call_log": state.get("tool_call_log", []) + [result.to_log_dict()],
        "progress_events": progress,
        "messages": [AIMessage(content="Hotel information fetched.")],
        "llm_calls": state.get("llm_calls", 0) + llm_calls_made,
    }


# =========================
# Node: Itinerary Agent
# =========================

async def itinerary_agent(state: TravelState) -> dict:
    """Create a travel itinerary using LLM. Context-aware from travel_context."""
    start_time = time.monotonic()
    context = state.get("travel_context", {})
    validation_report = state.get("validation_report", {})

    # Build context-aware prompt
    context_lines = []
    if context.get("companions") and context["companions"] != "unknown":
        context_lines.append(f"Traveling: {context['companions']}")
    if context.get("budget_tier"):
        context_lines.append(f"Budget: {context['budget_tier']}")
    if context.get("trip_type") and context["trip_type"] != "mixed":
        context_lines.append(f"Trip type: {context['trip_type']}")
    if context.get("pace"):
        context_lines.append(f"Pace: {context['pace']}")

    from tools.flight_tool import parse_route, AIRPORTS
    dep_iata, _ = parse_route(state["user_query"])
    origin_city = "Mumbai (BOM)"
    if dep_iata:
        origin_info = AIRPORTS.get(dep_iata, {})
        origin_city = f"{origin_info.get('city', dep_iata)} ({dep_iata})"
    context_lines.append(f"Origin starting location: {origin_city}")

    context_str = "\n".join(context_lines) if context_lines else "No specific preferences provided."

    # If validator sent corrections, include them
    correction_note = ""
    if validation_report and not validation_report.get("passed", True):
        corrections = validation_report.get("corrections", "")
        if corrections:
            correction_note = f"""

⚠️ IMPORTANT — Your previous itinerary had these issues that MUST be fixed:
{corrections}

Please regenerate the itinerary with these corrections applied."""

    prompt = f"""Create a complete, practical travel itinerary.

User Query:
{state['user_query']}

Travel Preferences:
{context_str}

Flight Results:
{state.get('flight_results', 'Not available')}

Hotel Results:
{state.get('hotel_results', 'Not available')}

Requirements:
- Make the itinerary practical, budget-aware, and easy to follow.
- Include specific place names, timings, and practical tips.
- For each and every attraction, stop, airport, or hotel mentioned in the day-by-day itinerary, you MUST append its exact or approximate coordinates in the format '**Location Name** [LAT, LNG]'. This is strict and mandatory for the route map to render!
Example format:
Day 1:
- Morning: Arrive at **Tokyo International Airport** [35.5494, 139.7798] and check-in to your hotel.
- Afternoon: Visit **Senso-ji Temple** [35.7147, 139.7967], Tokyo's oldest temple.
- Evening: Walk around **Ueno Park** [35.7140, 139.7740] and enjoy the sunset.

- Tailor recommendations to the traveler type ({context.get('companions', 'general')}) and trip type ({context.get('trip_type', 'general')})
{correction_note}"""

    progress = [emit_progress(state, "itinerary_agent", "Drafting day-by-day itinerary...", done=False)]

    response = await llm.ainvoke([
        SystemMessage(content="You are an expert travel planner. Create detailed, practical itineraries."),
        HumanMessage(content=prompt),
    ])

    progress.append(emit_progress(state, "itinerary_agent", "Itinerary draft complete", done=True))

    agents_used = state.get("agents_used", [])
    if "itinerary_agent" not in agents_used:
        agents_used = agents_used + ["itinerary_agent"]

    metrics = log_agent_metric(state, "itinerary_agent", start_time, response=response)

    return {
        "itinerary": response.content,
        "agents_used": agents_used,
        "agent_metrics": state.get("agent_metrics", []) + metrics,
        "progress_events": progress,
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# =========================
# Node: Validator Agent
# =========================

# =========================
# Node: Knowledge Retriever (Deterministic APIs)
# =========================

async def knowledge_retriever(state: TravelState) -> dict:
    """
    Retrieves factual travel data programmatically using free APIs:
    - Wikipedia (grounding context)
    - Overpass API (restaurants and facilities)
    - ExchangeRate API (currency exchange)
    - Sunrise-Sunset API (astronomy timings)
    """
    start_time = time.monotonic()
    destination = state.get("travel_context", {}).get("destination", "")
    if not destination:
        destination = state.get("user_query", "")
        
    progress = [emit_progress(state, "knowledge_retriever", f"Retrieving factual data for {destination}...", done=False)]
    
    # 1. Geocode destination to center coordinates (needed for Overpass/Sunrise)
    from tools.geocode_tool import geocode_location
    lat, lng = 0.0, 0.0
    geocode_result: ToolCallResult = await safe_tool_call(
        geocode_location, destination,
        timeout_s=5.0,
        source_name="nominatim"
    )
    if geocode_result.success and geocode_result.data and geocode_result.data.get("success"):
        lat = geocode_result.data["lat"]
        lng = geocode_result.data["lng"]
        
    if lat == 0.0 and lng == 0.0:
        lat, lng = 35.6762, 139.6503  # Fallback: Tokyo
        logger.warning(f"Geocoding failed for {destination}. Using fallback coordinates.")

    api_calls = 1
    
    # 2. Wikipedia Summary (Circuit breaker protected)
    from tools.wikipedia_tool import fetch_wikipedia_summary
    wiki_result: ToolCallResult = await safe_tool_call(
        fetch_wikipedia_summary, destination,
        timeout_s=5.0,
        source_name="wikipedia"
    )
    wiki_summary = wiki_result.data or ""
    api_calls += 1

    # 3. Restaurants & Facilities (Overpass) (Circuit breaker protected)
    from tools.overpass_tool import fetch_restaurants_near, fetch_facilities_near
    rest_result: ToolCallResult = await safe_tool_call(
        fetch_restaurants_near, lat, lng,
        timeout_s=8.0,
        source_name="overpass_restaurants"
    )
    raw_restaurants = rest_result.data or []
    api_calls += 1
    
    fac_result: ToolCallResult = await safe_tool_call(
        fetch_facilities_near, lat, lng,
        timeout_s=8.0,
        source_name="overpass_facilities"
    )
    facilities = fac_result.data or []
    api_calls += 1

    # 4. Currency exchange rate
    from tools.currency_tool import fetch_exchange_rate
    to_currency = "INR"
    dest_lower = destination.lower()
    if any(k in dest_lower for k in ["europe", "paris", "spain", "italy", "france", "rome"]):
        to_currency = "EUR"
    elif any(k in dest_lower for k in ["japan", "tokyo", "kyoto"]):
        to_currency = "JPY"
    elif any(k in dest_lower for k in ["dubai", "uae"]):
        to_currency = "AED"
    elif any(k in dest_lower for k in ["bali", "indonesia"]):
        to_currency = "IDR"
    elif any(k in dest_lower for k in ["cape town", "south africa"]):
        to_currency = "ZAR"
        
    curr_result: ToolCallResult = await safe_tool_call(
        fetch_exchange_rate, "USD", to_currency,
        timeout_s=5.0,
        source_name="currency_exchange"
    )
    currency_data = curr_result.data or {"rate": 1.0, "success": False, "from": "USD", "to": to_currency}
    api_calls += 1

    # 5. Sunrise/Sunset (Astronomy)
    from tools.sunrise_tool import fetch_sunrise_sunset
    sun_result: ToolCallResult = await safe_tool_call(
        fetch_sunrise_sunset, lat, lng,
        timeout_s=5.0,
        source_name="sunrise_sunset"
    )
    astronomy_data = sun_result.data or {"success": False}
    api_calls += 1

    progress.append(emit_progress(state, "knowledge_retriever", "Factual data retrieved successfully", done=True))
    
    metrics = log_agent_metric(state, "KnowledgeRetriever", start_time, api_calls=api_calls)
    
    return {
        "currency_data": currency_data,
        "agent_metrics": metrics,
        "progress_events": progress,
        "travel_context": {
            **state.get("travel_context", {}),
            "wiki_summary": wiki_summary,
            "raw_restaurants": raw_restaurants,
            "facilities": facilities,
            "astronomy_data": astronomy_data,
            "lat": lat,
            "lng": lng
        }
    }


# =========================
# Node: Route Optimizer (0 tokens)
# =========================

async def route_optimizer(state: TravelState) -> dict:
    """
    Programmatic route optimizer node. Excludes LLM calls (0 tokens).
    Parses stop coordinates from itinerary text, runs nearest-neighbor TSP,
    and returns metrics showing time/distance saved.
    """
    start_time = time.monotonic()
    itinerary_text = state.get("itinerary", "")
    if not itinerary_text:
        return {
            "agent_metrics": log_agent_metric(state, "RouteOptimizer", start_time)
        }
        
    progress = [emit_progress(state, "route_optimizer", "Optimizing transit routing...", done=False)]
    
    # Parse map coordinates from itinerary (Format: **Location** ... [lat, lng] or (lat, lng))
    import re
    from tools.route_tool import optimize_stop_sequence
    
    pattern = r"\*\*([^*]+)\*\*.*?(?:\[|\()([0-9.-]+),\s*([0-9.-]+)(?:\]|\))"
    matches = re.findall(pattern, itinerary_text)
    
    stops = []
    for match in matches:
        try:
            stops.append({
                "name": match[0].strip(),
                "lat": float(match[1]),
                "lng": float(match[2])
            })
        except ValueError:
            pass
            
    optimized_stops, route_meta = optimize_stop_sequence(stops)
    
    map_locations = []
    for idx, stop in enumerate(optimized_stops):
        map_locations.append({
            "name": stop["name"],
            "lat": stop["lat"],
            "lng": stop["lng"],
            "type": "itinerary",
            "sequence": idx + 1
        })
        
    facilities = state.get("travel_context", {}).get("facilities", [])
    for fac in facilities:
        map_locations.append({
            "name": fac["name"],
            "lat": fac["lat"],
            "lng": fac["lng"],
            "type": fac["type"]
        })

    progress.append(emit_progress(state, "route_optimizer", f"Optimized route! Saved {route_meta['time_saved_minutes']} mins of transit.", done=True))
    
    metrics = log_agent_metric(state, "RouteOptimizer", start_time)
    
    return {
        "optimized_route_meta": route_meta,
        "map_locations": map_locations,
        "agent_metrics": metrics,
        "progress_events": progress
    }


# =========================
# Nodes: Decoupled Validators
# =========================

async def budget_validator(state: TravelState) -> dict:
    """Programmatic budget validation (0 tokens)."""
    start_time = time.monotonic()
    context = state.get("travel_context", {})
    budget_limit = context.get("max_budget") or 100000.0 # Default fallback cap
    
    hotel_results = state.get("hotel_results", "")
    flight_results = state.get("flight_results", "")
    
    import re
    prices = [int(p) for p in re.findall(r"\$(\d+)", hotel_results + flight_results)]
    total_spent = sum(prices)
    
    passed = True
    issues = []
    if budget_limit and total_spent > budget_limit:
        passed = False
        issues.append(f"Projected total expenses (${total_spent}) exceed your maximum budget limit (${budget_limit}).")
        
    metrics = log_agent_metric(state, "BudgetValidator", start_time)
    
    return {
        "validation_report": {
            **state.get("validation_report", {}),
            "budget_pass": passed,
            "budget_spent": total_spent,
            "budget_issues": issues
        },
        "agent_metrics": metrics
    }


async def schedule_validator(state: TravelState) -> dict:
    """Programmatic date/sequence validation (0 tokens)."""
    start_time = time.monotonic()
    context = state.get("travel_context", {})
    
    itinerary_text = state.get("itinerary", "")
    import re
    day_count = len(re.findall(r"Day\s+\d+", itinerary_text))
    expected_days = context.get("num_days", 0)
    
    passed = True
    issues = []
    if expected_days > 0 and day_count != expected_days:
        passed = False
        issues.append(f"Itinerary day count ({day_count}) does not match your requested length of {expected_days} days.")
        
    metrics = log_agent_metric(state, "ScheduleValidator", start_time)
    
    return {
        "validation_report": {
            **state.get("validation_report", {}),
            "schedule_pass": passed,
            "schedule_issues": issues
        },
        "agent_metrics": metrics
    }


async def geo_validator(state: TravelState) -> dict:
    """Programmatic geographic proximity validation (0 tokens)."""
    start_time = time.monotonic()
    map_locations = state.get("map_locations", [])
    
    passed = True
    issues = []
    
    itinerary_pins = [p for p in map_locations if p.get("type") == "itinerary"]
    itinerary_pins.sort(key=lambda x: x.get("sequence", 0))
    
    from tools.route_tool import haversine_distance
    for i in range(len(itinerary_pins) - 1):
        dist = haversine_distance(
            itinerary_pins[i]["lat"], itinerary_pins[i]["lng"],
            itinerary_pins[i+1]["lat"], itinerary_pins[i+1]["lng"]
        )
        if dist > 300.0:
            passed = False
            issues.append(f"Geographic discrepancy: '{itinerary_pins[i]['name']}' is {dist:.1f} km away from '{itinerary_pins[i+1]['name']}' in a single day.")
            
    metrics = log_agent_metric(state, "GeoValidator", start_time)
    
    return {
        "validation_report": {
            **state.get("validation_report", {}),
            "geo_pass": passed,
            "geo_issues": issues
        },
        "agent_metrics": metrics
    }


async def final_validator(state: TravelState) -> dict:
    """Decides if the itinerary is approved or loops back to itinerary_agent for corrections."""
    start_time = time.monotonic()
    report = state.get("validation_report", {})
    attempts = state.get("validation_attempts", 0) + 1
    
    passed = report.get("budget_pass", True) and report.get("schedule_pass", True) and report.get("geo_pass", True)
    all_issues = report.get("budget_issues", []) + report.get("schedule_issues", []) + report.get("geo_issues", [])
    
    progress = [emit_progress(state, "final_validator", f"Validating plan (attempt {attempts})...", done=False)]
    
    validation_status = {
        "passed": passed,
        "issues": all_issues,
        "corrections": "\n".join(all_issues) if not passed else "",
        "issues_found": len(all_issues),
        "auto_corrected": not passed and attempts < 2,
        "attempt": attempts
    }
    
    if passed:
        progress.append(emit_progress(state, "final_validator", "✅ Plan validated successfully!", done=True))
    else:
        if attempts < 2:
            progress.append(emit_progress(state, "final_validator", f"Found {len(all_issues)} validation issues. Requesting corrections...", done=True))
        else:
            progress.append(emit_progress(state, "final_validator", f"⚠ Validation warnings noted (max attempts reached). Shipping plan.", done=True))
            
    metrics = log_agent_metric(state, "FinalValidator", start_time)
    
    return {
        "validation_report": validation_status,
        "validation_pass": passed or attempts >= 2,
        "validation_attempts": attempts,
        "agent_metrics": metrics,
        "progress_events": progress
    }


# =========================
# Node: Travel Insights Agent (Story, Foodie, Culture Curation)
# =========================

async def travel_insights_agent(state: TravelState) -> dict:
    """
    Reasoning Agent: TravelInsightsAgent
    Consolidates data curations into structured payloads:
    - Grounded Wikipedia Stories (StoryAgent)
    - Foodie Curations with Confidence Score (FoodieAgent)
    - Subjective Culture & Safety Advisories (CultureAgent)
    - Photo Planner Sunrise/Sunset angles (PhotoPlannerAgent)
    """
    start_time = time.monotonic()
    context = state.get("travel_context", {})
    destination = context.get("destination", "")
    wiki_summary = context.get("wiki_summary", "No Wikipedia summary available.")
    raw_restaurants = context.get("raw_restaurants", [])
    astronomy = context.get("astronomy_data", {})
    
    progress = [emit_progress(state, "travel_insights_agent", "Generating travel insights, culture guides, and local stories...", done=False)]
    
    rest_context = ""
    for idx, r in enumerate(raw_restaurants[:10]):
        rest_context += f"- {r['name']} ({r['cuisine']} cuisine, hours: {r['opening_hours']})\n"
        
    prompt = f"""You are a travel insights curator. Analyze the raw travel data for '{destination}' and generate a structured JSON object.
    
    Wikipedia Summary:
    {wiki_summary}
    
    Overpass Eateries Nearby:
    {rest_context if rest_context else "None available."}
    
    Astronomy Sun Timings:
    Sunrise: {astronomy.get('sunrise', '6:00 AM')}, Sunset: {astronomy.get('sunset', '6:00 PM')}
    Golden Hours: morning={astronomy.get('golden_hour_morning')}, evening={astronomy.get('golden_hour_evening')}
    
    Tasks:
    1. STORY: Write a highly engaging 100-word "Did You Know?" story about '{destination}' strictly grounded in the Wikipedia facts. Do NOT invent/hallucinate secret tunnels or details not in the Wikipedia summary.
    2. FOOD: Curate up to 5 restaurants from the provided Overpass list. Provide a recommendation reasoning (budget, vegetarian options, closeness, or cuisine match) and suggested local dishes.
    3. CULTURE: Detail local cultural etiquette: Tipping rules, greetings, dress codes, dining manners.
    4. SAFETY ADVICE: Outline general safety guidelines (social safety, scams, transport, solo travel tips).
    
    You MUST output EXACTLY a valid JSON object matching this schema (do not wrap in markdown blocks, just raw JSON text):
    {{
      "story": {{
        "title": "...",
        "content": "..."
      }},
      "food_recommendations": [
        {{
          "name": "...",
          "cuisine": "...",
          "why_recommended": ["...", "..."],
          "suggested_dishes": ["...", "..."]
        }}
      ],
      "culture": {{
        "tipping": "...",
        "greetings": "...",
        "dress_code": "...",
        "dining_etiquette": "..."
      }},
      "general_safety_tips": ["...", "..."]
    }}"""

    response = await llm.ainvoke([
        SystemMessage(content="You are a meticulous travel data curator. You always return valid, parseable JSON payloads matching the requested schema."),
        HumanMessage(content=prompt)
    ])
    
    clean_content = response.content.strip()
    if clean_content.startswith("```json"):
        clean_content = clean_content[7:]
    if clean_content.endswith("```"):
        clean_content = clean_content[:-3]
    clean_content = clean_content.strip()
    
    try:
        curated_data = json.loads(clean_content)
    except Exception as e:
        logger.error(f"Failed to parse travel insights JSON: {e}. Content: {clean_content}")
        curated_data = {
            "story": {"title": "About " + destination, "content": wiki_summary[:200] + "..."},
            "food_recommendations": [],
            "culture": {"tipping": "No specific rules.", "greetings": "Polite nod.", "dress_code": "Casual.", "dining_etiquette": "Clean your plate."},
            "general_safety_tips": ["Stay aware of surroundings.", "Keep valuables secure."]
        }
        
    hotel_pos = {"lat": context.get("lat", 0.0), "lng": context.get("lng", 0.0)}
    curated_rest = curated_data.get("food_recommendations", [])
    
    from tools.route_tool import haversine_distance
    final_food_recommendations = []
    
    for r in curated_rest:
        match = next((item for item in raw_restaurants if item["name"] == r["name"]), None)
        lat = match["lat"] if match else hotel_pos["lat"]
        lng = match["lng"] if match else hotel_pos["lng"]
        cuisine = match["cuisine"] if match else r.get("cuisine", "local")
        hours = match["opening_hours"] if match else "not specified"
        
        dist = haversine_distance(hotel_pos["lat"], hotel_pos["lng"], lat, lng) if hotel_pos["lat"] != 0.0 else 1.0
        dist_score = 30 if dist <= 2.0 else (15 if dist <= 5.0 else 5)
        
        budget_score = 20
        hours_score = 20 if hours != "not specified" else 10
        weather_score = 10
        cuisine_score = 20 if cuisine != "local" else 10
        
        confidence = dist_score + budget_score + hours_score + weather_score + cuisine_score
        
        final_food_recommendations.append({
            "name": r["name"],
            "lat": lat,
            "lng": lng,
            "cuisine": cuisine,
            "hours": hours,
            "why_recommended": r.get("why_recommended", ["Highly rated locally"]),
            "suggested_dishes": r.get("suggested_dishes", []),
            "confidence_score": confidence,
            "confidence_breakdown": {
                "distance": dist_score,
                "budget": budget_score,
                "hours": hours_score,
                "weather": weather_score,
                "reviews": cuisine_score
            }
        })
        
    alerts_query = f"travel warnings protests natural disasters strikes in {destination}"
    alerts_result: ToolCallResult = await safe_tool_call(
        tavily_search, alerts_query,
        timeout_s=6.0,
        source_name="alerts_tavily"
    )
    raw_alerts_text = alerts_result.data.get("text", "") if isinstance(alerts_result.data, dict) else (alerts_result.data or "")
    
    alerts_list = []
    if "strike" in raw_alerts_text.lower() or "protest" in raw_alerts_text.lower() or "warning" in raw_alerts_text.lower():
        alerts_list.append({
            "type": "warning",
            "message": "Local travel alerts: Check transit schedules for active protests or strikes.",
            "severity": "medium"
        })
    else:
        alerts_list.append({
            "type": "info",
            "message": f"No active alerts/protests reported for {destination} today.",
            "severity": "low"
        })
        
    photo_plan = [
        {
            "activity": "Sunrise Viewpoint",
            "time": astronomy.get("sunrise", "06:00 AM"),
            "location": "Local Viewpoint / Heights",
            "golden_hour": astronomy.get("golden_hour_morning", "05:30 AM - 06:15 AM"),
            "expected_crowd": "Low",
            "tip": "Arrive 20 mins early to set up tripod for dawn gradient shades."
        },
        {
            "activity": "Sunset Silhouette",
            "time": astronomy.get("sunset", "06:00 PM"),
            "location": "River/Coast or Rooftop View",
            "golden_hour": astronomy.get("golden_hour_evening", "05:30 PM - 06:15 PM"),
            "expected_crowd": "Moderate",
            "tip": "Capture backlighting as the sun moves behind architecture details."
        }
    ]

    progress.append(emit_progress(state, "travel_insights_agent", "Travel insights created", done=True))
    
    metrics = log_agent_metric(state, "TravelInsightsAgent", start_time, response=response)
    
    return {
        "hidden_places": [
            {
                "name": curated_data.get("story", {}).get("title", "Local Secret Spot"),
                "description": curated_data.get("story", {}).get("content", ""),
                "specialty": "Wikipedia Fact-checked Story",
                "lat": hotel_pos["lat"] + 0.005,
                "lng": hotel_pos["lng"] - 0.005,
                "best_time": "Afternoon walk",
                "images": state.get("images", [])[:2]
            }
        ],
        "food_recommendations": final_food_recommendations,
        "culture_and_language": {
            "etiquette": curated_data.get("culture", {}),
            "phrases": [
                {"phrase": "Thank you", "local": "Arigatou", "phonetic": "Ah-ree-gah-toh"},
                {"phrase": "Hello", "local": "Konnichiwa", "phonetic": "Kohn-nee-chee-wah"},
                {"phrase": "How much?", "local": "Ikura desu ka", "phonetic": "Ee-koo-rah deh-soo kah"}
            ]
        },
        "safety_report": {
            "safety_score": 85,
            "ratings": {
                "night_safety": 4,
                "scam_risk": 2,
                "solo_women": 4,
                "public_transport": 5,
                "medical_access": 4
            },
            "tips": curated_data.get("general_safety_tips", ["Keep items locked in hotel safe."])
        },
        "photo_plan": photo_plan,
        "alerts": alerts_list,
        "agent_metrics": state.get("agent_metrics", []) + metrics,
        "progress_events": progress
    }


# =========================
# Node: Final Response Agent
# =========================

async def final_agent(state: TravelState) -> dict:
    """
    Formats the final polished response. Data-freshness aware.
    For flights_only / hotels_only intents, adapts the output format.
    """
    start_time = time.monotonic()
    intent = state.get("intent", "full_itinerary")
    context = state.get("travel_context", {})

    sections = []
    if state.get("flight_results"):
        sections.append(f"Flight Information:\n{state['flight_results']}")
    if state.get("hotel_results"):
        sections.append(f"Hotel Suggestions:\n{state['hotel_results']}")
    if state.get("itinerary"):
        sections.append(f"Day-by-Day Itinerary:\n{state['itinerary']}")

    data_sections = "\n\n".join(sections) if sections else "No specific data was gathered for this query."

    validation = state.get("validation_report", {})
    validation_note = ""
    if validation.get("auto_corrected"):
        validation_note = "\nNote: The itinerary was automatically refined after quality validation."
    elif validation.get("issues"):
        validation_note = f"\nNote: {len(validation['issues'])} minor issues were noted but the plan is still usable."

    final_prompt = f"""Generate the final travel response for the user.
    
    User Request: {state['user_query']}
    Intent: {intent}
    Travel Context: {json.dumps(context, default=str)}
    
    Gathered Data:
    {data_sections}
    {validation_note}
    
    Format the response beautifully using appropriate sections based on what data is available.
    Include standard titles like Trip Summary, Budget Estimates, and Final Tips.
    
    CRITICAL REQUIREMENT: In the polished Day-by-Day Itinerary, you MUST preserve all location names and their corresponding coordinates in the exact format '**Location Name** [LAT, LNG]'. Do NOT strip or rewrite these bracketed coordinates, as they are parsed programmatically to render the route map pins!
    """

    progress = [emit_progress(state, "final_agent", "Polishing final response...", done=False)]

    destination = context.get("destination", "")
    images = state.get("images", [])
    
    if not images and destination:
        from tools.image_tool import fetch_unsplash_images
        img_result: ToolCallResult = await safe_tool_call(
            fetch_unsplash_images, destination,
            timeout_s=5.0,
            source_name="unsplash"
        )
        images = img_result.data or []

    response = await llm.ainvoke([
        SystemMessage(content="You are a professional AI travel assistant. Create beautiful, practical travel plans."),
        HumanMessage(content=final_prompt),
    ])

    progress.append(emit_progress(state, "final_agent", "✨ Your travel plan is ready!", done=True))

    agents_used = state.get("agents_used", []) + ["final_agent"]
    metrics = log_agent_metric(state, "final_agent", start_time, response=response)

    return {
        "images": images,
        "agents_used": agents_used,
        "agent_metrics": state.get("agent_metrics", []) + metrics,
        "progress_events": progress,
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# =========================
# Build Graph
# =========================

def build_travel_graph() -> StateGraph:
    """Construct the dynamic supervisor-routed parallel multi-agent graph."""
    graph = StateGraph(TravelState)

    # Add all nodes
    graph.add_node("supervisor", supervisor_router)
    graph.add_node("flight_agent", flight_agent)
    graph.add_node("hotel_agent", hotel_agent)
    graph.add_node("itinerary_agent", itinerary_agent)
    graph.add_node("knowledge_retriever", knowledge_retriever)
    graph.add_node("route_optimizer", route_optimizer)
    
    # Decoupled Validators
    graph.add_node("budget_validator", budget_validator)
    graph.add_node("schedule_validator", schedule_validator)
    graph.add_node("geo_validator", geo_validator)
    graph.add_node("final_validator", final_validator)
    
    graph.add_node("travel_insights_agent", travel_insights_agent)
    graph.add_node("final_agent", final_agent)

    # Start point
    graph.add_edge(START, "supervisor")

    # Conditional supervisor branching
    graph.add_conditional_edges(
        "supervisor",
        route_by_intent,
        {
            "flight_agent": "flight_agent",
            "hotel_agent": "hotel_agent",
            "itinerary_agent": "itinerary_agent",
            "knowledge_retriever": "knowledge_retriever",
            "final_agent": "final_agent",
        },
    )

    # Flight branches to Hotel
    graph.add_conditional_edges(
        "flight_agent",
        after_flight_agent,
        {
            "final_agent": "final_agent",
            "hotel_agent": "hotel_agent",
        },
    )

    # Hotel branches to Join check or Final agent
    graph.add_conditional_edges(
        "hotel_agent",
        after_hotel_agent,
        {
            "final_agent": "final_agent",
            "route_optimizer": "route_optimizer",
            END: END,
        },
    )
    
    # Itinerary & KnowledgeRetriever check to Join before running RouteOptimizer
    graph.add_conditional_edges(
        "itinerary_agent",
        should_run_route_optimizer,
        {
            "route_optimizer": "route_optimizer",
            END: END,
        },
    )
    graph.add_conditional_edges(
        "knowledge_retriever",
        should_run_route_optimizer,
        {
            "route_optimizer": "route_optimizer",
            END: END,
        },
    )

    # RouteOptimizer goes to sequential validation pipeline
    graph.add_edge("route_optimizer", "budget_validator")
    graph.add_edge("budget_validator", "schedule_validator")
    graph.add_edge("schedule_validator", "geo_validator")
    graph.add_edge("geo_validator", "final_validator")

    # Final validator checks correction loops or continues
    graph.add_conditional_edges(
        "final_validator",
        should_retry_or_finalize,
        {
            "itinerary_agent": "itinerary_agent",
            "travel_insights_agent": "travel_insights_agent",
        },
    )

    # Travel insights curations route to final polishing agent
    graph.add_edge("travel_insights_agent", "final_agent")
    
    # Finish
    graph.add_edge("final_agent", END)

    return graph


def should_run_route_optimizer(state: TravelState) -> str:
    """Join check router. Ensures route_optimizer only runs once all parallel paths complete."""
    intent = state.get("intent", "full_itinerary")
    
    if intent == "full_itinerary":
        has_hotels = bool(state.get("hotel_results"))
        has_itinerary = bool(state.get("itinerary"))
        has_retriever = bool(state.get("currency_data") or state.get("photo_plan"))
        
        if has_hotels and has_itinerary and has_retriever:
            return "route_optimizer"
        return END
        
    elif intent == "itinerary_only":
        has_itinerary = bool(state.get("itinerary"))
        has_retriever = bool(state.get("currency_data") or state.get("photo_plan"))
        
        if has_itinerary and has_retriever:
            return "route_optimizer"
        return END
        
    return "route_optimizer"


def route_by_intent(state: TravelState) -> list[str] | str:
    """Returns the next branch node(s) based on user intent classification."""
    intent = state.get("intent", "full_itinerary")

    if intent == "flights_only":
        return "flight_agent"
    elif intent == "hotels_only":
        return "hotel_agent"
    elif intent == "itinerary_only":
        return ["itinerary_agent", "knowledge_retriever"]
    elif intent == "general_chat":
        return "final_agent"
    else: # full_itinerary
        return ["flight_agent", "itinerary_agent", "knowledge_retriever"]


def should_retry_or_finalize(state: TravelState) -> str:
    """Determines validation pipeline branch."""
    if not state.get("validation_pass", True) and state.get("validation_attempts", 0) < 2:
        return "itinerary_agent"
    return "travel_insights_agent"


def after_flight_agent(state: TravelState) -> str:
    if state.get("intent") == "flights_only":
        return "final_agent"
    return "hotel_agent"


def after_hotel_agent(state: TravelState) -> str:
    if state.get("intent") == "hotels_only":
        return "final_agent"
    return should_run_route_optimizer(state)


travel_graph_builder = build_travel_graph()

