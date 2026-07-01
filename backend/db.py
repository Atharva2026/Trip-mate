import logging
import json
from typing import Optional, List, Dict
import backend

logger = logging.getLogger("tripmate.db")


async def init_db_schema():
    """
    Creates the users and trips tables in the PostgreSQL database if they do not exist.
    """
    if not backend.pool:
        raise RuntimeError("Database pool is not initialized. Call init_backend() first.")

    create_users_table = """
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    create_trips_table = """
    CREATE TABLE IF NOT EXISTS trips (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        destination VARCHAR(255),
        query TEXT NOT NULL,
        result_json JSONB NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    try:
        async with backend.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(create_users_table)
                await cur.execute(create_trips_table)
        logger.info("Database schemas (users + trips) verified/created successfully.")
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}", exc_info=True)
        raise e


# =========================
# User CRUD Helpers
# =========================

async def create_user(email: str, password_hash: str) -> str:
    """Create a new user and return their UUID string."""
    query = """
    INSERT INTO users (email, password_hash)
    VALUES (%s, %s)
    RETURNING id;
    """
    async with backend.pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, (email.strip().lower(), password_hash))
            res = await cur.fetchone()
            return str(res[0])


async def get_user_by_email(email: str) -> Optional[Dict]:
    """Retrieve user details by email."""
    query = "SELECT id, email, password_hash, created_at FROM users WHERE email = %s;"
    async with backend.pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, (email.strip().lower(),))
            res = await cur.fetchone()
            if res:
                return {
                    "id": str(res[0]),
                    "email": res[1],
                    "password_hash": res[2],
                    "created_at": res[3]
                }
            return None


# =========================
# Trip CRUD Helpers
# =========================

async def save_trip(
    trip_id: str,
    user_id: Optional[str],
    title: str,
    destination: Optional[str],
    query: str,
    result_json: dict,
    is_public: bool = False
) -> bool:
    """
    Save or update a trip in the database.
    """
    # UPSERT trip
    upsert_query = """
    INSERT INTO trips (id, user_id, title, destination, query, result_json, is_public)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) 
    DO UPDATE SET 
        user_id = COALESCE(EXCLUDED.user_id, trips.user_id),
        title = EXCLUDED.title,
        destination = EXCLUDED.destination,
        query = EXCLUDED.query,
        result_json = EXCLUDED.result_json,
        is_public = EXCLUDED.is_public;
    """
    # Convert dict to JSON string for Postgres compatibility
    res_str = json.dumps(result_json)
    
    try:
        async with backend.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    upsert_query, 
                    (trip_id, user_id, title, destination, query, res_str, is_public)
                )
        logger.info(f"Successfully saved trip_id={trip_id} in DB.")
        return True
    except Exception as e:
        logger.error(f"Error saving trip_id={trip_id}: {e}", exc_info=True)
        return False


async def get_trip(trip_id: str) -> Optional[Dict]:
    """Retrieve details of a single trip by ID."""
    query = """
    SELECT id, user_id, title, destination, query, result_json, is_public, created_at
    FROM trips
    WHERE id = %s;
    """
    async with backend.pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, (trip_id,))
            res = await cur.fetchone()
            if res:
                # result_json is returned as dict/json if connection pool auto-parses or raw string
                res_json = res[5]
                if isinstance(res_json, str):
                    res_json = json.loads(res_json)
                
                return {
                    "id": res[0],
                    "user_id": str(res[1]) if res[1] else None,
                    "title": res[2],
                    "destination": res[3],
                    "query": res[4],
                    "result_json": res_json,
                    "is_public": res[6],
                    "created_at": res[7]
                }
            return None


async def list_user_trips(user_id: str) -> List[Dict]:
    """List all trips saved by a specific user (newest first)."""
    query = """
    SELECT id, title, destination, query, created_at, is_public
    FROM trips
    WHERE user_id = %s
    ORDER BY created_at DESC;
    """
    trips_list = []
    async with backend.pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, (user_id,))
            rows = await cur.fetchall()
            for r in rows:
                trips_list.append({
                    "id": r[0],
                    "title": r[1],
                    "destination": r[2],
                    "query": r[3],
                    "created_at": r[4],
                    "is_public": r[5]
                })
    return trips_list


async def delete_trip(trip_id: str, user_id: str) -> bool:
    """Delete a trip belonging to a specific user."""
    query = "DELETE FROM trips WHERE id = %s AND user_id = %s;"
    try:
        async with backend.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (trip_id, user_id))
        return True
    except Exception as e:
        logger.error(f"Failed to delete trip_id={trip_id}: {e}")
        return False


async def set_trip_public_status(trip_id: str, user_id: str, is_public: bool) -> bool:
    """Update visibility sharing status of a user's trip."""
    query = "UPDATE trips SET is_public = %s WHERE id = %s AND user_id = %s;"
    try:
        async with backend.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (is_public, trip_id, user_id))
        return True
    except Exception as e:
        logger.error(f"Failed to set trip share status: {e}")
        return False
