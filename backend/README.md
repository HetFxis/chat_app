# Chat API Backend

A well-structured FastAPI backend for a real-time chat application.

## 📁 Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── config.py              # Configuration settings
├── models.py              # SQLAlchemy database models
├── schemas.py             # Pydantic schemas
├── database.py            # Database connection and session
├── auth.py                # Authentication utilities
├── websocket_manager.py   # WebSocket connection manager
├── routers/               # API route modules
│   ├── __init__.py
│   ├── auth.py           # Authentication routes
│   ├── users.py          # User management routes
│   ├── messages.py       # Message routes
│   └── websocket.py      # WebSocket routes
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables
└── start.sh              # Startup script
```

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns
- **Environment Configuration**: Settings via .env file
- **Type Safety**: Pydantic schemas for request/response validation
- **Authentication**: JWT-based auth with bcrypt password hashing
- **Real-time Communication**: WebSocket support for live messaging
- **Database**: SQLAlchemy ORM with SQLite
- **API Documentation**: Auto-generated docs at `/docs`

## 🛠️ Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   - Copy `.env` and update values as needed
   - Change `SECRET_KEY` in production

3. **Run the server**:
   ```bash
   python main.py
   # or
   ./start.sh
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/login` - User login

### Users
- `GET /api/me` - Get current user info

### Messages
- `GET /api/messages` - Get public messages
- `GET /api/messages/private/{user}` - Get private messages

### WebSocket
- `WS /ws/{username}` - Real-time messaging

## 🔧 Configuration

All settings are managed in `config.py` and can be overridden via environment variables:

- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: JWT signing key
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `ALLOWED_ORIGINS`: CORS allowed origins

## 📖 Documentation

Visit `/docs` when the server is running for interactive API documentation.
