from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings
from models import Base

# Create engine
engine = create_engine(
    settings.database_url, 
    connect_args={"check_same_thread": False}
)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
