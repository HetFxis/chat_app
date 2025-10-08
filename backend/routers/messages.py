from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
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
    try:
        # Use raw SQL to avoid SQLAlchemy pagination issues
        from sqlalchemy import text
        
        query = text("""
            SELECT m.id, m.content, m.sender_id, m.room, m.group_id, m.timestamp, u.username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room = :room
            ORDER BY m.timestamp DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {"room": room, "limit": limit}).fetchall()
        
        messages = []
        for row in result:
            messages.append(MessageResponse(
                id=row.id,
                content=row.content,
                sender=row.username,
                timestamp=row.timestamp,
                room=row.room,
                isPrivate=row.room.startswith("private_"),
                group_id=row.group_id
            ))
        
        return list(reversed(messages))
    except SQLAlchemyError as e:
        print(f"Database error in get_messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch messages"
        )

@router.get("/messages/private/{other_user}", response_model=List[MessageResponse])
async def get_private_messages(
    other_user: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Create consistent room name for private messages
        room_name = f"private_{min(current_user.username, other_user)}_{max(current_user.username, other_user)}"
        
        # Use raw SQL to avoid SQLAlchemy pagination issues
        from sqlalchemy import text
        
        query = text("""
            SELECT m.id, m.content, m.sender_id, m.room, m.group_id, m.timestamp, u.username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room = :room_name
            ORDER BY m.timestamp DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {"room_name": room_name, "limit": limit}).fetchall()
        
        messages = []
        for row in result:
            messages.append(MessageResponse(
                id=row.id,
                content=row.content,
                sender=row.username,
                timestamp=row.timestamp,
                room=row.room,
                isPrivate=True,
                recipient=other_user if row.username == current_user.username else current_user.username,
                group_id=row.group_id
            ))
        
        return list(reversed(messages))
    except SQLAlchemyError as e:
        print(f"Database error in get_private_messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch private messages"
        )
