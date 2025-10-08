from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import json

from database import get_db
from models import User, Message
from websocket_manager import manager
from .push import send_push_to_username

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    # Get database session
    db = next(get_db())
    
    await manager.connect(websocket, username)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Get the user from database
            user = db.query(User).filter(User.username == username).first()
            if not user:
                continue
            
            # Check if it's a private message
            if message_data.get("type") == "private" and message_data.get("recipient"):
                recipient = message_data.get("recipient")
                content = message_data.get("content", "")
                
                # Save private message to database
                db_message = Message(
                    content=content,
                    sender_id=user.id,
                    room=f"private_{min(username, recipient)}_{max(username, recipient)}"
                )
                db.add(db_message)
                db.commit()
                db.refresh(db_message)
                
                private_msg = json.dumps({
                    "type": "private_message",
                    "sender": username,
                    "recipient": recipient,
                    "content": content,
                    "timestamp": db_message.timestamp.isoformat(),
                    "isPrivate": True
                })
                
                # Send to recipient
                sent = await manager.send_personal_message(private_msg, recipient)
                
                # Always send push notification (service worker will decide whether to show)
                # This ensures notifications work even when tab is in background
                send_push_to_username(
                    recipient,
                    f"New message from {username}",
                    content[:100],  # First 100 chars
                    {"sender": username, "type": "private"},
                    db
                )
                
                # Echo back to sender
                await manager.send_personal_message(private_msg, username)
                
            else:
                # Save public message to database
                content = message_data.get("content", "")
                db_message = Message(
                    content=content,
                    sender_id=user.id,
                    room="general"
                )
                db.add(db_message)
                db.commit()
                db.refresh(db_message)
                
                # Broadcast public message to all connected clients
                await manager.broadcast(json.dumps({
                    "type": "message",
                    "sender": username,
                    "content": content,
                    "timestamp": db_message.timestamp.isoformat()
                }))
                

                # Send push notifications to offline users
                all_users = db.query(User).filter(User.username != username).all()
                for user in all_users:
                    # Check if user is offline (not in active connections)
                    # if user.username not in manager.active_connections:
                    send_push_to_username(
                            user.username,
                            f"New message in general from {username}",
                            content[:100],
                            {"sender": username, "type": "public"},
                            db
                    )
            
    except WebSocketDisconnect:
        manager.disconnect(username)
        await manager.broadcast_user_list()
    finally:
        db.close()
