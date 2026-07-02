# ✈️ Globe Express — Multi-Agent Travel Orchestration Engine

Globe Express (powered by TripMate AI) is a production-grade, stateful multi-agent travel planning platform. It leverages **LangGraph**, **FastAPI**, and **React** to compile comprehensive travel itineraries—integrating live flight coordination, target-budget hotel research, geolocation mapping, and weather forecasting—from natural language queries.

---

## 🏗️ System Architecture & Workflow

The core engine is structured as a **Stateful Directed Acyclic Graph (DAG)** built using **LangGraph**. The workflow isolates responsibilities across a team of specialized agents, co-ordinated by a central Supervisor Router.

```mermaid
graph TD
    User([User Query]) --> Supervisor{Supervisor Router}
    
    Supervisor -->|flights_only / full_itinerary| FlightAgent[Flight Agent]
    Supervisor -->|hotels_only / full_itinerary| HotelAgent[Hotel Agent]
    Supervisor -->|general_chat| FinalAgent[Response Formatter]
    
    FlightAgent --> HotelAgent
    HotelAgent --> ItineraryPlanner[Itinerary Planner]
    ItineraryPlanner --> QualityAuditor{Quality Auditor / Validator}
    
    QualityAuditor -->|Issues Found & Retry < 3| ItineraryPlanner
    QualityAuditor -->|Validated / Max Retries| FinalAgent
    
    FinalAgent --> SSE[Server-Sent Events Stream]
    SSE --> Frontend[React Dashboard]
```

### 🧠 The Multi-Agent Team

1. **Supervisor Router**: Inspects user query using structured Pydantic models. Extracts constraints like `companions`, `budget_tier`, `pace`, and `destination`, then routes to the appropriate agent pipeline.
2. **Flight Search Agent**: Resolves IATA codes via `airportsdata` / `pycountry` database lookups and queries live flight routes using the **AviationStack API**.
3. **Hotel Research Agent**: Researches accommodations matching the traveler's budget criteria using custom search filters via **Tavily API**.
4. **Itinerary Planner**: Gathers the flight & hotel outputs and writes a day-by-day itinerary integrating local travel times and dining recommendations.
5. **Quality Auditor (Validator)**: A critic agent that checks for logical consistency:
   * Checks if hotel check-in matches flight arrival.
   * Compares plan cost with the user's budget.
   * Flags geographic impossibilities.
   * If errors are found, it triggers a **correction loop** (up to 3 times) back to the planner.
6. **Response Formatter (Final Agent)**: Formats the plan, injects live weather forecasts (via **wttr.in**), appends high-resolution location imagery (via **Unsplash**), and outputs the payload.

---

## ⚡ Technical Highlights (For Interviews)

*   **Resilient LLM Failovers**: Built with LangChain's `.with_fallbacks()` mechanism. If the primary `llama-3.3-70b-versatile` hits a `429 Rate Limit` on Groq, the engine seamlessly switches to `llama-3.1-8b-instant` mid-execution, preventing pipeline crashes.
*   **Stateful PostgreSql Checkpointing**: Uses `AsyncPostgresSaver` to persist graph memory. Users can close their browsers and reload their sessions instantly from the database.
*   **Non-Blocking Real-time Streaming**: Implements Server-Sent Events (SSE) via a custom `asyncio` Queue manager. The backend streams step progress to the React frontend while running intensive tasks in background threads.
*   **Secure Manual Auth**: Avoids third-party OAuth overhead by using custom local JWT tokens, bcrypt password hashing, and authorization guards.

---

## 📁 Repository Structure

```
├── app.py                  # FastAPI server & Server-Sent Events (SSE) endpoints
├── Dockerfile              # Multi-stage Docker builder (React + Python slim compilation)
├── pyproject.toml          # Project configuration and backend dependencies
├── requirements.txt        # Production python pins
├── backend/
│   ├── auth.py             # JWT token issuance & bcrypt hashing verification
│   ├── db.py               # PostgreSQL table schemas and trip persistence
│   ├── graph.py            # LangGraph StateGraph pipeline, fallbacks, & agent logic
│   └── core/
│       ├── cache.py        # In-memory caching layer
│       ├── rate_limit.py   # Token rate-limiter with localhost bypass
│       └── sse.py          # Real-time event queue manager
├── tools/
│   ├── flight_tool.py      # AviationStack integration & IATA resolvers
│   ├── geocode_tool.py     # Nominatim Geocoding API
│   ├── image_tool.py       # Unsplash photo library query tool
│   └── weather_tool.py     # wttr.in weather forecast fetching
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx   # Interactive plan engine, PDF exports, and stepper UI
    │   │   └── LandingPage.jsx # Glassmorphic homepage with dynamic testimonials carousel
    │   └── components/
    │       └── AgentStepper.jsx # Real-time agent status stepper
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
*   Python `3.11` or newer
*   Node.js `20.x` or newer
*   PostgreSQL instance running locally

### 2. Configure Environment Variables
Create a `.env` file in the root folder:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tripmate
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly_...
AVIATIONSTACK_API_KEY=your_aviationstack_key
JWT_SECRET=your_secure_random_key_for_auth
```

### 3. Run the Backend (FastAPI)
Install dependencies and boot:
```bash
# Using uv (highly recommended)
uv pip install -r requirements.txt
uv run python app.py

# Or using standard pip
pip install -r requirements.txt
python app.py
```
The server starts at `http://localhost:8000`.

### 4. Run the Frontend (Vite)
Navigate to the frontend folder, install packages, and start the development server:
```bash
cd frontend
npm install
npm run dev
```

---

## 🐳 Docker Production Build

To run the entire monorepo as a single container (matching the Render production configuration):

```bash
# Build the unified image
docker build -t globe-express .

# Run the container
docker run -p 8000:8000 --env-file .env globe-express
```
The container uses a Node Alpine build stage to compile frontend assets, copies them to the FastAPI static directory, and boots the Python server on port `8000`.