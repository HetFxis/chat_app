from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models import User
from schemas import UserCreate, Token, UserResponse, RefreshToken
from auth import get_password_hash, authenticate_user, create_access_token, create_refresh_token, verify_token
from config import settings

router = APIRouter(prefix="/api", tags=["authentication"])

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    
    if db_user:
        if db_user.username == user.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(db_user)
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_data: RefreshToken, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        username = verify_token(refresh_data.refresh_token, credentials_exception)
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise credentials_exception
            
        # Create new tokens
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        new_refresh_token = create_refresh_token(data={"sub": user.username})
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user)
        }
    except Exception:
        raise credentials_exception
