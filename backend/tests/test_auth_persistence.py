import asyncio
import uuid
import logging
from backend import init_backend, close_backend, run_travel_agent
from backend.auth import hash_password, verify_password, create_access_token, decode_access_token
from backend.db import create_user, get_user_by_email, save_trip, get_trip, list_user_trips, delete_trip

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tripmate.test")

async def test_auth_and_persistence():
    logger.info("Initializing backend...")
    await init_backend()
    
    # 1. Test Password Hashing
    logger.info("Testing Password Hashing...")
    password = "SuperSecurePassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) == True
    assert verify_password("wrong_password", hashed) == False
    logger.info("✅ Password hashing verified.")

    # 2. Test User Creation & Retrieval
    logger.info("Testing User Creation & DB retrieval...")
    test_email = f"test_user_{uuid.uuid4().hex[:6]}@example.com"
    user_id = await create_user(test_email, hashed)
    assert user_id is not None
    logger.info(f"Created test user with ID: {user_id}")
    
    user_record = await get_user_by_email(test_email)
    assert user_record is not None
    assert user_record["email"] == test_email
    assert user_record["id"] == user_id
    assert verify_password(password, user_record["password_hash"]) == True
    logger.info("✅ User registration and database schema verified.")

    # 3. Test JWT Token Lifecycle
    logger.info("Testing Access Token Generation & Decoding...")
    token = create_access_token(user_id, test_email)
    assert token is not None
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == test_email
    logger.info("✅ JWT token generation and validation verified.")

    # 4. Test Trip Saving & Reading
    logger.info("Testing Trip Persistence...")
    trip_id = f"trip_{uuid.uuid4().hex}"
    test_query = "Plan a weekend in Rome"
    test_result = {
        "thread_id": trip_id,
        "intent": "full_itinerary",
        "answer": "Here is a Rome plan...",
        "itinerary": "Day 1: Colosseum, Day 2: Vatican",
        "images": [],
        "booking_links": []
    }
    
    # Save the trip
    saved = await save_trip(
        trip_id=trip_id,
        user_id=user_id,
        title="Weekend in Rome",
        destination="Rome",
        query=test_query,
        result_json=test_result,
        is_public=False
    )
    assert saved == True
    
    # Retrieve the trip
    retrieved_trip = await get_trip(trip_id)
    assert retrieved_trip is not None
    assert retrieved_trip["title"] == "Weekend in Rome"
    assert retrieved_trip["user_id"] == user_id
    assert retrieved_trip["result_json"]["answer"] == "Here is a Rome plan..."
    logger.info("✅ Trip saving and JSONB formatting verified.")

    # 5. Test Listing User Trips
    logger.info("Testing User Trips List...")
    trips_list = await list_user_trips(user_id)
    assert len(trips_list) == 1
    assert trips_list[0]["id"] == trip_id
    assert trips_list[0]["title"] == "Weekend in Rome"
    logger.info("✅ Listing user trips verified.")

    # 6. Test Trip Deletion
    logger.info("Testing Trip Deletion...")
    deleted = await delete_trip(trip_id, user_id)
    assert deleted == True
    
    retrieved_after_delete = await get_trip(trip_id)
    assert retrieved_after_delete is None
    logger.info("✅ Trip deletion verified.")

    logger.info("Closing backend...")
    await close_backend()
    
    print("\n🎯 ALL BACKEND AUTH & PERSISTENCE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_auth_and_persistence())
