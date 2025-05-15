from typing import Dict, Any
from fastapi import WebSocket
import json
from app.core.logger import logger

class ConnectionManager:
    """
    WebSocket接続を管理し、メッセージの送受信を扱う
    """
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Connected: {client_id}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Disconnected: {client_id}")

    async def send_message(self, client_id: str, message: Any):
        websocket = self.active_connections.get(client_id)
        if websocket:
            await websocket.send_text(json.dumps(message))
            logger.info(f"Sent message to {client_id}: {message}")


manager = ConnectionManager()