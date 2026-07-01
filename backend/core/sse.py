import asyncio
import logging
from typing import Dict

logger = logging.getLogger("tripmate.sse")

class SSEQueueManager:
    def __init__(self):
        self._queues: Dict[str, asyncio.Queue] = {}

    def get_queue(self, trip_id: str) -> asyncio.Queue:
        if trip_id not in self._queues:
            logger.info(f"Creating SSE queue for trip_id={trip_id}")
            self._queues[trip_id] = asyncio.Queue()
        return self._queues[trip_id]

    def remove_queue(self, trip_id: str):
        if trip_id in self._queues:
            logger.info(f"Removing SSE queue for trip_id={trip_id}")
            del self._queues[trip_id]

    def push(self, trip_id: str, event: dict):
        if trip_id in self._queues:
            logger.debug(f"Pushing SSE event to trip_id={trip_id}: {event}")
            self._queues[trip_id].put_nowait(event)
        else:
            # If the queue doesn't exist yet, we can create it and store the event
            # so it's not lost when the client connects.
            logger.debug(f"Creating SSE queue on-the-fly for trip_id={trip_id} to cache event")
            queue = self.get_queue(trip_id)
            queue.put_nowait(event)

# Global singleton manager
sse_manager = SSEQueueManager()
