"""
TripMate AI v2 — Backend Entry Point

Initializes the async PostgreSQL connection pool and saver, compiles the graph, and exposes run_travel_agent().
"""

import os
import uuid
import certifi
import logging
from dotenv import load_dotenv

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langchain_core.messages import HumanMessage

from backend.graph import travel_graph_builder

logger = logging.getLogger("tripmate.backend")

# Global pool, checkpointer and compiled graph references
pool = None
checkpointer = None
travel_graph = None


def get_database_url():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError(
            "DATABASE_URL is missing. Please add your Render PostgreSQL External Database URL to .env"
        )

    if "sslmode=" not in database_url:
        separator = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{separator}sslmode=require"

    return database_url


async def init_backend():
    """Initialize connection pool and compile the travel graph."""
    global pool, checkpointer, travel_graph
    if travel_graph is not None:
        return

    logger.info("Initializing backend connection pool and AsyncPostgresSaver...")
    database_url = get_database_url()

    pool = AsyncConnectionPool(
        conninfo=database_url,
        min_size=2,
        max_size=10,
        kwargs={"autocommit": True},
    )

    checkpointer = AsyncPostgresSaver(pool)
    await checkpointer.setup()

    # Create users & trips tables if they do not exist
    from backend.db import init_db_schema
    await init_db_schema()

    # Compile the graph with checkpointer
    travel_graph = travel_graph_builder.compile(checkpointer=checkpointer)
    logger.info("Backend travel graph compiled successfully.")


async def close_backend():
    """Gracefully close the connection pool."""
    global pool, checkpointer, travel_graph
    if pool is not None:
        logger.info("Closing backend connection pool...")
        await pool.close()
        pool = None
        checkpointer = None
        travel_graph = None
        logger.info("Backend connection pool closed.")


# =========================
# Public API (called by app.py)
# =========================

async def run_travel_agent(
    user_input: str,
    thread_id: str | None = None,
    travel_context: dict | None = None,
    user_id: str | None = None,
) -> dict:
    """
    Run the travel agent graph for a user query asynchronously.

    Args:
        user_input: The user's travel query
        thread_id: Optional thread ID for conversation continuity
        travel_context: Optional pre-filled context from questionnaire
        user_id: Optional user ID for logged-in users

    Returns:
        Dict with all results, provenance metadata, and observability data
    """
    global travel_graph
    if travel_graph is None:
        await init_backend()

    if not thread_id:
        thread_id = f"user_{uuid.uuid4().hex}"

    config = {
        "configurable": {
            "thread_id": thread_id,
        }
    }

    # Build initial state
    initial_state = {
        "messages": [HumanMessage(content=user_input)],
        "user_query": user_input,
        "user_id": user_id,
        "trip_id": thread_id,
        "intent": "",
        "travel_context": travel_context or {},
        "flight_results": "",
        "hotel_results": "",
        "itinerary": "",
        "validation_report": {},
        "validation_pass": True,
        "validation_attempts": 0,
        "images": [],
        "booking_links": [],
        "map_locations": [],
        "agents_used": [],
        "data_freshness": {},
        "tool_call_log": [],
        "progress_events": [],
        "llm_calls": 0,
    }

    result = await travel_graph.ainvoke(initial_state, config=config)

    final_answer = result["messages"][-1].content

    return {
        "thread_id": thread_id,
        "intent": result.get("intent", ""),
        "agents_used": result.get("agents_used", []),
        "answer": final_answer,
        "flight_results": result.get("flight_results", ""),
        "hotel_results": result.get("hotel_results", ""),
        "itinerary": result.get("itinerary", ""),
        "images": result.get("images", []),
        "booking_links": result.get("booking_links", []),
        "map_locations": result.get("map_locations", []),
        "weather": result.get("weather", {}),
        "validation_report": result.get("validation_report", {}),
        "data_freshness": result.get("data_freshness", {}),
        "tool_call_log": result.get("tool_call_log", []),
        "llm_calls": result.get("llm_calls", 0),
    }
