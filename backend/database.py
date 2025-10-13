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

# Create tables (only if they don't exist - for development without migrations)
def create_tables():
    """Create all database tables if they don't exist"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created (if they didn't exist)!")

# Optional: Create tables on import for development
# Comment this out if you want to use migrations exclusively
# create_tables()

# Dependency to get database session
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
