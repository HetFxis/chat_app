from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio

from database import get_db
from models import User, Message, GroupChat, group_membership
from websocket_manager import manager
from .push import send_push_to_username
from sqlalchemy import and_

router = APIRouter(tags=["websocket"])

async def send_push_background(recipient: str, title: str, body: str, data: dict):
    """Send push notification in background without blocking WebSocket"""
    db = next(get_db())
    try:
        await send_push_to_username(recipient, title, body, data, db)
    except Exception as e:
        print(f"Background push notification error: {e}")
    finally:
        db.close()

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
            # Check message type
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
                
               
                # Send push notification in background (non-blocking)
                asyncio.create_task(send_push_background(
                    recipient,
                    f"New message from {username}",
                    content[:100],  # First 100 chars
                    {"sender": username, "type": "private"}
                ))
                
                # Echo back to sender
                await manager.send_personal_message(private_msg, username)
            elif message_data.get("type") == "group" and message_data.get("group_id"):
                group_id = message_data.get("group_id")
                content = message_data.get("content", "")
                
                # Verify user is a member of the group
                membership = db.query(group_membership).filter(
                    and_(
                        group_membership.c.user_id == user.id,
                        group_membership.c.group_id == group_id
                    )
                ).first()
                
                if not membership:
                    continue  # User is not a member, ignore message
                
                # Get group info
                group = db.query(GroupChat).filter(GroupChat.id == group_id).first()
                if not group:
                    continue
                
                # Save group message to database
                db_message = Message(
                    content=content,
                    sender_id=user.id,
                    room=f"group_{group_id}",
                    group_id=group_id
                )
                db.add(db_message)
                db.commit()
                db.refresh(db_message)
                
                group_msg = json.dumps({
                    "type": "group_message",
                    "sender": username,
                    "group_id": group_id,
                    "group_name": group.name,
                    "content": content,
                    "timestamp": db_message.timestamp.isoformat()
                })
                
                # Get all group members
                group_members = db.query(User).join(
                    group_membership, User.id == group_membership.c.user_id
                ).filter(
                    group_membership.c.group_id == group_id
                ).all()
                
                # Send to all group members
                for member in group_members:
                    await manager.send_personal_message(group_msg, member.username)
                    
                    # Send push notification to offline members (except sender) in background
                    if member.username != username:
                        asyncio.create_task(send_push_background(
                            member.username,
                            f"New message in {group.name} from {username}",
                            content[:100],
                            {"sender": username, "type": "group", "group_name": group.name}
                        ))
                
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
                

                # Send push notifications to offline users in background
                all_users = db.query(User).filter(User.username != username).all()
                for other_user in all_users:
                    # Check if user is offline (not in active connections)
                    # if other_user.username not in manager.active_connections:
                    asyncio.create_task(send_push_background(
                        other_user.username,
                        f"New message in general from {username}",
                        content[:100],
                        {"sender": username, "type": "public"}
                    ))
            
    except WebSocketDisconnect:
        manager.disconnect(username)
        await manager.broadcast_user_list()
    finally:
        db.close()
