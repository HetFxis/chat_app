from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import settings
from routers import auth, users, messages, websocket, push

# Initialize FastAPI app
app = FastAPI(
    title="Chat API",
    description="A real-time chat application API",
    version="1.0.0"
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

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Chat API is running",
        "version": "1.0.0",
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
