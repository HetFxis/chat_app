from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Message
from schemas import MessageResponse
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["messages"])

@router.get("/messages", response_model=List[MessageResponse])
async def get_messages(
    room: str = "general",
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(
        Message.room == room
    ).order_by(Message.timestamp.desc()).limit(limit).all()
    
    return [
        MessageResponse(
            id=msg.id,
            content=msg.content,
            sender=msg.sender.username,
            timestamp=msg.timestamp,
            room=msg.room,
            isPrivate=msg.room.startswith("private_")
        )
        for msg in reversed(messages)
    ]

@router.get("/messages/private/{other_user}", response_model=List[MessageResponse])
async def get_private_messages(
    other_user: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create consistent room name for private messages
    room_name = f"private_{min(current_user.username, other_user)}_{max(current_user.username, other_user)}"
    
    messages = db.query(Message).filter(
        Message.room == room_name
    ).order_by(Message.timestamp.desc()).limit(limit).all()
    
    return [
        MessageResponse(
            id=msg.id,
            content=msg.content,
            sender=msg.sender.username,
            timestamp=msg.timestamp,
            room=msg.room,
            isPrivate=True,
            recipient=other_user if msg.sender.username == current_user.username else current_user.username
        )
        for msg in reversed(messages)
    ]
