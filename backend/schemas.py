from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Auth Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

class RefreshToken(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Message Schemas
class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    room: Optional[str] = "general"

class MessageResponse(MessageBase):
    id: int
    sender: str
    timestamp: datetime
    room: str
    isPrivate: Optional[bool] = False
    recipient: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
