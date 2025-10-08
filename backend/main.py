from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from config import settings
from routers import auth, users, messages, websocket, push, groups

# Import database to ensure tables are created
import database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Chat API with Group Functionality")
    print("📊 Database tables initialized")
    print("🔗 WebSocket support enabled")
    print("👥 Group chat functionality ready")
    yield
    # Shutdown
    print("👋 Shutting down Chat API")

# Initialize FastAPI app
app = FastAPI(
    title="Chat API with Group Functionality",
    description="A real-time chat application API with group chat support",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(websocket.router)
app.include_router(push.router)
app.include_router(groups.router)

# Startup event moved to lifespan context manager above

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Chat API with Group Functionality is running",
        "version": "2.0.0",
        "features": [
            "Real-time messaging",
            "Private messages", 
            "Group chat",
            "Push notifications",
            "User authentication"
        ],
        "docs": "/docs"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host=settings.host, 
        port=settings.port, 
        reload=True
    )
