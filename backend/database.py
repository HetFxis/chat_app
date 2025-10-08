from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings

# Create engine
engine = create_engine(
    settings.database_url, 
    connect_args={"check_same_thread": False}
)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import all models to ensure they are registered with Base
from models import Base, User, Message, PushSubscription, GroupChat, group_membership

# Create tables
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("All database tables created successfully!")

# Create tables on import (for development)
create_tables()

# Dependency to get database session
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
