import asyncio
import json
import logging
import traceback
import uuid
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, EmailStr

from contextlib import asynccontextmanager
from backend import run_travel_agent, init_backend, close_backend
from backend.core.rate_limit import check_rate_limit, RateLimitExceeded
from backend.core.sse import sse_manager
from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_id,
    require_user_id
)
from backend.db import (
    create_user,
    get_user_by_email,
    save_trip,
    get_trip,
    list_user_trips,
    delete_trip,
    set_trip_public_status
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tripmate.app")

BASE_DIR = Path(__file__).resolve().parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the backend database connection pool and checkpointer
    await init_backend()
    yield
    # Gracefully close connection pool on shutdown
    await close_backend()

app = FastAPI(
    title="TripMate AI",
    description="LangGraph Multi-Agent Travel Planner with FastAPI Frontend",
    version="1.0.0",
    lifespan=lifespan
)

# Exception handler for rate limit exceeded
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": exc.message,
            "retry_after": exc.retry_after_seconds
        },
        headers={"Retry-After": str(exc.retry_after_seconds)}
    )

# Serve static files from React build directory if it exists, otherwise fall back to old templates
react_dist_dir = BASE_DIR / "frontend" / "dist"
if (react_dist_dir / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(react_dist_dir / "assets")),
        name="assets"
    )
else:
    app.mount(
        "/static",
        StaticFiles(directory=str(BASE_DIR / "static")),
        name="static"
    )

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)


# Pydantic Schemas
class TravelRequest(BaseModel):
    message: str
    thread_id: str | None = None
    stream: bool = False
    travel_context: dict | None = None


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class ShareTripRequest(BaseModel):
    is_public: bool


# =========================
# Auth API Endpoints
# =========================

@app.post("/api/auth/register")
async def register(req: UserRegisterRequest):
    try:
        email = req.email.strip().lower()
        existing = await get_user_by_email(email)
        if existing:
            raise HTTPException(status_code=400, detail="A user with this email already exists.")

        hashed = hash_password(req.password)
        user_id = await create_user(email, hashed)
        token = create_access_token(user_id, email)

        return {
            "success": True,
            "token": token,
            "user": {"id": user_id, "email": email}
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in register endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during registration.")


@app.post("/api/auth/login")
async def login(req: UserLoginRequest):
    try:
        email = req.email.strip().lower()
        user = await get_user_by_email(email)
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        token = create_access_token(user["id"], email)

        return {
            "success": True,
            "token": token,
            "user": {"id": user["id"], "email": email}
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in login endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during login.")


@app.get("/api/auth/me")
async def get_me(user_id: str = Depends(require_user_id)):
    return {
        "success": True,
        "user_id": user_id
    }


# =========================
# Travel & Graph API Endpoints
# =========================

@app.post("/api/travel")
async def travel_planner(request_data: TravelRequest, background_tasks: BackgroundTasks, request: Request):
    try:
        # Resolve user authentication (optional)
        user_id = await get_current_user_id(request)
        
        # Check Rate Limit (authenticated users get higher rate limit tier)
        client_ip = request.client.host
        check_rate_limit(client_ip, user_id=user_id)

        user_message = request_data.message.strip()
        if not user_message:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Message cannot be empty."}
            )

        thread_id = request_data.thread_id
        if not thread_id:
            thread_id = f"user_{uuid.uuid4().hex}"

        # Helper function to extract title & destination to save
        def get_trip_metadata(res):
            dest = request_data.travel_context.get("destination") if request_data.travel_context else ""
            if not dest:
                # Try to extract primary destination from classified intent or context
                dest = res.get("intent", "").replace("_only", "").replace("full_", "")
            
            title = f"Trip to {dest.title()}" if dest else "My Custom Itinerary"
            return title, dest

        # If user requests SSE streaming
        if request_data.stream:
            # Pre-initialize queue to avoid race conditions
            sse_manager.get_queue(thread_id)

            async def run_in_background():
                try:
                    result = await run_travel_agent(
                        user_input=user_message,
                        thread_id=thread_id,
                        travel_context=request_data.travel_context,
                        user_id=user_id
                    )
                    
                    # Auto-save generated trip to database
                    title, dest = get_trip_metadata(result)
                    await save_trip(
                        trip_id=thread_id,
                        user_id=user_id,
                        title=title,
                        destination=dest,
                        query=user_message,
                        result_json=result
                    )

                    # Push final completed agent payload
                    sse_manager.push(thread_id, {
                        "node": "final_agent",
                        "message": "Final plan generated",
                        "done": True,
                        "payload": result
                    })
                except Exception as e:
                    logger.error(f"Error in background task execution for thread_id={thread_id}: {e}", exc_info=True)
                    sse_manager.push(thread_id, {
                        "node": "error",
                        "message": f"Orchestration failed: {str(e)}",
                        "done": True
                    })

            background_tasks.add_task(run_in_background)

            return JSONResponse(
                content={
                    "success": True,
                    "thread_id": thread_id,
                    "status": "started"
                }
            )

        # Standard blocking / synchronous query execution
        result = await run_travel_agent(
            user_input=user_message,
            thread_id=thread_id,
            travel_context=request_data.travel_context,
            user_id=user_id
        )

        # Auto-save generated trip to database
        title, dest = get_trip_metadata(result)
        await save_trip(
            trip_id=thread_id,
            user_id=user_id,
            title=title,
            destination=dest,
            query=user_message,
            result_json=result
        )

        return JSONResponse(
            content={
                "success": True,
                "thread_id": result["thread_id"],
                "intent": result["intent"],
                "agents_used": result["agents_used"],
                "answer": result["answer"],
                "flight_results": result["flight_results"],
                "hotel_results": result["hotel_results"],
                "itinerary": result["itinerary"],
                "images": result["images"],
                "booking_links": result["booking_links"],
                "map_locations": result["map_locations"],
                "weather": result["weather"],
                "validation_report": result["validation_report"],
                "data_freshness": result["data_freshness"],
                "tool_call_log": result["tool_call_log"],
                "llm_calls": result["llm_calls"],
            }
        )

    except Exception as e:
        logger.error(f"ERROR in travel_planner: {e}")
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )


@app.get("/api/travel/stream/{thread_id}")
async def travel_stream(thread_id: str):
    """
    Server-Sent Events endpoint to stream real-time agent progression events
    for a given travel planning session.
    """
    async def event_generator():
        queue = sse_manager.get_queue(thread_id)
        try:
            while True:
                # Retrieve next progress event from the queue
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                
                # Close connection if finalized or error occurs
                if event.get("done") and (event.get("node") == "final_agent" or event.get("node") == "error"):
                    await asyncio.sleep(0.5)
                    break
        except asyncio.CancelledError:
            logger.info(f"SSE stream client disconnected for thread_id={thread_id}")
        finally:
            sse_manager.remove_queue(thread_id)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# =========================
# Trip Account API Endpoints
# =========================

@app.get("/api/trips")
async def get_user_trips(user_id: str = Depends(require_user_id)):
    try:
        trips = await list_user_trips(user_id)
        return {
            "success": True,
            "trips": trips
        }
    except Exception as e:
        logger.error(f"Error listing user trips: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve trips list.")


@app.get("/api/trips/{trip_id}")
async def get_single_trip(trip_id: str, request: Request):
    try:
        trip = await get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip plan not found.")

        # Access check: public or owner
        if not trip["is_public"]:
            user_id = await get_current_user_id(request)
            if not user_id or user_id != trip["user_id"]:
                raise HTTPException(status_code=403, detail="You do not have permission to view this private plan.")

        return {
            "success": True,
            "trip": trip
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching trip {trip_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve trip details.")


@app.delete("/api/trips/{trip_id}")
async def remove_user_trip(trip_id: str, user_id: str = Depends(require_user_id)):
    try:
        trip = await get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip plan not found.")
            
        if trip["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this plan.")

        await delete_trip(trip_id, user_id)
        return {
            "success": True,
            "message": "Trip plan deleted successfully."
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting trip {trip_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete trip plan.")


@app.post("/api/trips/{trip_id}/share")
async def toggle_trip_share(trip_id: str, body: ShareTripRequest, user_id: str = Depends(require_user_id)):
    try:
        trip = await get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip plan not found.")

        if trip["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to toggle sharing on this plan.")

        await set_trip_public_status(trip_id, user_id, body.is_public)
        return {
            "success": True,
            "is_public": body.is_public,
            "message": "Sharing status updated successfully."
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating sharing on trip {trip_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update sharing status.")


@app.post("/api/trips/{trip_id}/save")
async def save_trip_to_user(trip_id: str, user_id: str = Depends(require_user_id)):
    try:
        trip = await get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip plan not found.")

        # Associate this trip with the logged-in user
        success = await save_trip(
            trip_id=trip_id,
            user_id=user_id,
            title=trip["title"],
            destination=trip["destination"],
            query=trip["query"],
            result_json=trip["result_json"],
            is_public=trip["is_public"]
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save trip to user account.")

        return {
            "success": True,
            "message": "Trip saved to account successfully."
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error associating trip {trip_id} to user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save trip to user account.")


# =========================
# Generic Endpoints
# =========================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "AI Travel Planner API is running"
    }


@app.get("/favicon.ico")
async def favicon():
    react_favicon = BASE_DIR / "frontend" / "dist" / "favicon.ico"
    if react_favicon.exists():
        return FileResponse(react_favicon)
    return JSONResponse(content={})


# Catch-all endpoint to support React Router client-side SPA routing
@app.get("/{path:path}", response_class=HTMLResponse)
async def catch_all(request: Request, path: str):
    # Check if a static file exists at this path in the frontend/dist folder
    dist_file = BASE_DIR / "frontend" / "dist" / path
    if dist_file.is_file():
        return FileResponse(dist_file)

    react_index = BASE_DIR / "frontend" / "dist" / "index.html"
    if react_index.exists():
        return HTMLResponse(content=react_index.read_text())
        
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )



if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )