from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException
from pydantic import BaseModel
import json

from database import get_db
from models import User, PushSubscription
from auth import get_current_user
from config import settings

router = APIRouter(prefix="/api", tags=["push"])

@router.post("/subscribe")
async def subscribe_to_push(
    subscription: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save push subscription for the current user"""
    try:
        # Check if subscription already exists
        existing = db.query(PushSubscription).filter(
            PushSubscription.endpoint == subscription["endpoint"]
        ).first()
        
        if existing:
            # Update existing subscription
            existing.user_id = current_user.id
            existing.p256dh = subscription["keys"]["p256dh"]
            existing.auth = subscription["keys"]["auth"]
        else:
            # Create new subscription
            push_sub = PushSubscription(
                user_id=current_user.id,
                endpoint=subscription["endpoint"],
                p256dh=subscription["keys"]["p256dh"],
                auth=subscription["keys"]["auth"]
            )
            db.add(push_sub)
        
        db.commit()
        return {"status": "subscribed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class UnsubscribeRequest(BaseModel):
    endpoint: str

@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    request: UnsubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove push subscription"""
    subscription = db.query(PushSubscription).filter(
        PushSubscription.endpoint == request.endpoint,
        PushSubscription.user_id == current_user.id
    ).first()
    
    if subscription:
        db.delete(subscription)
        db.commit()
        return {"status": "unsubscribed"}
    
    # If not found, still return success (idempotent)
    return {"status": "unsubscribed"}

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for frontend"""
    return {"publicKey": settings.vapid_public_key}

def send_push_notification(user_id: int, title: str, body: str, data: dict = None, db: Session = None):
    """Send push notification to a user's all subscribed devices"""
    try:
        print(f"Sending push notification to user_id: {user_id}")
        print(f"Title: {title}, Body: {body}")
        
        # Get all push subscriptions for the user
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id
        ).all()
        
        if not subscriptions:
            print(f"No push subscriptions found for user_id: {user_id}")
            return False
        
        print(f"Found {len(subscriptions)} subscription(s) for user")
        
        # Prepare notification payload
        notification_payload = {
            "notification": {
                "title": title,
                "body": body,
                "icon": "/icon-192x192.png",
                "badge": "/badge-72x72.png",
                "vibrate": [100, 50, 100],
                "data": data or {}
            }
        }
        
        # Send to all subscriptions
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": subscription.p256dh,
                            "auth": subscription.auth
                        }
                    },
                    data=json.dumps(notification_payload),
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": settings.vapid_email}
                )
                print(f"Successfully sent push notification to endpoint: {subscription.endpoint[:50]}...")
            except WebPushException as e:
                print(f"Push notification failed: {e}")
                print(f"Response status: {e.response.status_code if e.response else 'No response'}")
                print(f"Response text: {e.response.text if e.response else 'No response text'}")
                
                # If subscription is invalid, remove it
                if e.response and e.response.status_code == 410:
                    db.delete(subscription)
                    db.commit()
                    print("Removed invalid subscription")
        
        return True
    except Exception as e:
        print(f"Error sending push notification: {e}")
        return False

def send_push_to_username(username: str, title: str, body: str, data: dict = None, db: Session = None):
    """Send push notification to a user by username"""
    user = db.query(User).filter(User.username == username).first()
    if user:
        return send_push_notification(user.id, title, body, data, db)
    return False


