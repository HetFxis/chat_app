from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

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
    group_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# Group Schemas
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = False
    max_members: int = 100

class GroupCreate(GroupBase):
    members: Optional[List[str]] = []

class GroupResponse(GroupBase):
    id: int
    created_by: int
    created_at: datetime
    member_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)

class GroupMemberResponse(BaseModel):
    id: int
    username: str
    email: str
    joined_at: Optional[datetime] = None
    role: Optional[str] = "member"
    
    model_config = ConfigDict(from_attributes=True)
