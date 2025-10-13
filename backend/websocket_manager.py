from fastapi import WebSocket
from typing import Dict
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket
        await self.broadcast_user_list()

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]

    async def send_personal_message(self, message: str, username: str):
        if username in self.active_connections:
            websocket = self.active_connections[username]
            try:
                await websocket.send_text(message)
                return True
            except:
                # Connection might be closed, remove it
                self.disconnect(username)
                return False
        return False

    async def broadcast(self, message: str, exclude_user: str = None):
        disconnected_users = []
        for username, connection in self.active_connections.items():
            if username != exclude_user:
                try:
                    await connection.send_text(message)
                except:
                    # Connection is closed, mark for removal
                    disconnected_users.append(username)
        
        # Remove disconnected users
        for username in disconnected_users:
            self.disconnect(username)
    
    async def broadcast_user_list(self):
        users = list(self.active_connections.keys())
        message = json.dumps({
            "type": "users_update",
            "users": users
        })
        await self.broadcast(message)
    
    async def broadcast_group_update(self, username: str, group_data: dict, action: str = "added_to_group"):
        """Broadcast group updates to specific user"""
        message = json.dumps({
            "type": "group_update",
            "action": action,
            "group": group_data
        })
        await self.send_personal_message(message, username)
    
    async def broadcast_group_list_update(self, usernames: list):
        """Broadcast group list refresh to multiple users"""
        message = json.dumps({
            "type": "groups_refresh",
            "action": "refresh_groups"
        })
        for username in usernames:
            await self.send_personal_message(message, username)

# Global connection manager instance
manager = ConnectionManager()
