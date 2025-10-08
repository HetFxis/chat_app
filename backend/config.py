import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field
from typing import List
from dotenv import load_dotenv
load_dotenv()  # reads .env into environment

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./chat.db"
    
    # Security
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    refresh_token_expire_days: int = 7  # 7 days
    
    # CORS
    allowed_origins: List[str] = ["http://localhost:3000"]
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Push Notifications (VAPID) - Generated from vapidkeys.com
    vapid_public_key: str = os.environ["PUBLIC_KEY"]
    vapid_private_key: str  = os.environ["PRIVATE_KEY"]
    vapid_email: str  = os.environ["VAPID_EMAIL"]

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
