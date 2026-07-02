# ✈️ Globe Express — Multi-Agent Travel Orchestration Engine

### Problem
Planning trips today is fragmented and time-consuming. Travelers are forced to hop between flight aggregators, hotel search engines, mapping sites, and weather forecasts, manually copying coordinates and compiling spreadsheets. Globe Express unifies this workflow by utilizing collaborating LLM agents to draft, validate, and build comprehensive, production-ready travel plans dynamically from natural language queries.

### What is Globe Express?
Globe Express (powered by TripMate AI) is an open-source, community-driven multi-agent travel orchestration hub. It turns standard natural-language trip requests into highly detailed travel itineraries containing live flight quotes, verified hotel selections, day-by-day activity outlines, localized maps, and weather details.

Key highlights of the Globe Express project include:
*   **Stateful Orchestration**: Coordinated by a central supervisor node via LangGraph, agents interact asynchronously, share progress states, and run validation correction loops.
*   **Live Data Integration**: Queries real flight data using AviationStack, searches hotels via Tavily, extracts exact coordinates from Nominatim, and gets live weather forecasts from wttr.in.
*   **Resilient Design**: Automatically catches Groq rate limits (429 errors) on `llama-3.3-70b-versatile` and dynamically routes queries to `llama-3.1-8b-instant` to prevent pipeline failures.
*   **Save and Export**: Saves itineraries locally to a persistent PostgreSQL database and exports print-ready, style-cleaned travel plan PDFs.

---

### Features
*   **Open Source**: Built on the principles of transparency and customization. The entire code for both React frontend and Python backend is open and modifiable.
*   **Free to Use**: Globe Express uses free-tier developer API access keys for Groq, Tavily, and AviationStack, enabling self-hosting without premium pricing gates.
*   **Flexible Hosting**: Supports running the Python FastAPI and Vite React packages locally in split-terminal modes or building a single unified container for fast cloud deployment.
*   **Structured Validation Loops**: An auditor agent automatically validates checks (e.g. check-in date matching flight arrival) and prompts the planner agent for repairs up to 3 times before finalizing.

---

### ⚠️ Important Note: Rate Limiting & API Quotas
*   **Groq Token Limitations**: The default high-capacity LLM `llama-3.3-70b-versatile` has daily token quotas (TPD). If you hit a `Rate Limit Reached (429)` error, the backend will automatically fallback to the faster `llama-3.1-8b-instant` model.
*   **Localhost Rate-Limit Bypass**: Loopback IP addresses (`127.0.0.1`, `::1`, `localhost`) bypass local API tier rate limiting to allow uninterrupted developer testing and design iteration.

---

### 🏁 Installation

#### 📦 Using Docker (recommended)
To run the Globe Express project inside a single container using the multi-stage build:
1. Make sure you have Docker installed.
2. Clone the repository.
3. Create a `.env` file in the root folder using the template below:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/travel_db
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
AVIATIONSTACK_API_KEY=your_aviationstack_key
JWT_SECRET=your_jwt_signing_secret_key
DEFAULT_ORIGIN_IATA=BOM
```
4. Build the unified Docker image:
```bash
docker build -t globe-express .
```
5. Run the container:
```bash
docker run -p 8000:8000 --env-file .env globe-express
```
6. Access the site at `http://localhost:8000`.

#### 💻 Running locally
To run both backend and frontend servers locally on your machine:
1. **Configure Backend**:
```bash
# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install requirements & start FastAPI
pip install -r requirements.txt
python app.py
```
2. **Configure Frontend**:
```bash
cd frontend
npm install
npm run dev
```
3. Access the interactive web interface at `http://localhost:5173`.

#### 🚄 Using Render (One-click Web Service)
To deploy Globe Express to Render:
1. Click **New > PostgreSQL** on Render to spin up a database and copy the **Internal Database URL**.
2. Click **New > Web Service** and connect your repository.
3. Select **Runtime: Docker** (Render will automatically execute the multi-stage build).
4. Add the environment variables in the service settings page:
   * `DATABASE_URL` (Set to your Render Internal Database URL)
   * `GROQ_API_KEY` (Your Groq secret key)
   * `TAVILY_API_KEY` (Your Tavily secret key)
   * `AVIATIONSTACK_API_KEY` (Your AviationStack key)
   * `JWT_SECRET` (A strong random secret)
   * `PORT` (8000)
5. Click **Deploy Web Service**.

---

### 🧪 Testing
We maintain rigorous validation checks to ensure zero syntax or package crashes before code gets committed or deployed.

#### 💻 Run Compile & Import Audits
To compile all Python files in the codebase and check for missing modules or syntax exceptions, run:
```bash
python3 -m py_compile app.py backend/*.py tools/*.py
```
Make sure all test files compile cleanly without any warnings before triggering a deploy build.