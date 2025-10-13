from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select, func, update
from typing import List
from datetime import datetime, timezone
from .push import send_push_to_username

from database import get_db
from database import get_db
from models import User, GroupChat, Message, group_membership
from schemas import GroupCreate, GroupResponse, GroupMemberResponse, MessageResponse, AddMembersRequest
from auth import get_current_user
from websocket_manager import manager

router = APIRouter(prefix="/api/groups", tags=["groups"])

@router.get("/", response_model=List[GroupResponse])
async def get_user_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all groups that the current user is a member of"""
    try:
        # Query groups where user is a member
        groups = db.query(GroupChat).join(
            group_membership, GroupChat.id == group_membership.c.group_id
        ).filter(
            group_membership.c.user_id == current_user.id
        ).all()
        
        # Add member count to each group
        result = []
        for group in groups:
            group_dict = {
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "is_private": group.is_private,
                "max_members": group.max_members,
                "created_by": group.created_by,
                "created_at": group.created_at,
                "member_count": len(group.members)
            }
            result.append(group_dict)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch groups: {str(e)}"
        )

@router.post("/", response_model=GroupResponse)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new group"""
    try:
        # Create the group
        new_group = GroupChat(
            name=group_data.name,
            description=group_data.description,
            is_private=group_data.is_private,
            max_members=group_data.max_members,
            created_by=current_user.id
        )
        
        db.add(new_group)
        db.flush()  # Get the ID without committing
        
        # Add creator as admin member
        creator_membership = group_membership.insert().values(
            user_id=current_user.id,
            group_id=new_group.id,
            role="owner",
            joined_at=datetime.utcnow()
        )
        db.execute(creator_membership)
        
        # Add other members if specified
        if group_data.members:
            for username in group_data.members:
                user = db.query(User).filter(User.username == username).first()
                if user:
                    member_insert = group_membership.insert().values(
                        user_id=user.id,
                        group_id=new_group.id,
                        role="member",
                        joined_at=datetime.utcnow()
                    )
                    db.execute(member_insert)
                    send_push_to_username(
                            user.username,
                            f"You were added to new group {group_data.name}",
                            f"You have been added to the group '{group_data.name}' by {current_user.username}",
                            {"sender": current_user.username, "type": "group", "group_name": group_data.name},
                            db
                    )
                    
                    # Broadcast new group to the added user via WebSocket
                    new_group_data = {
                        "id": new_group.id,
                        "name": group_data.name,
                        "description": group_data.description,
                        "is_private": group_data.is_private,
                        "max_members": group_data.max_members,
                        "created_by": current_user.id,
                        "created_at": new_group.created_at.isoformat() if new_group.created_at else None,
                        "member_count": len(group_data.members) + 1
                    }
                    await manager.broadcast_group_update(user.username, new_group_data)
        
        db.commit()
        db.refresh(new_group)
        
        # Return group with member count
        return {
            "id": new_group.id,
            "name": new_group.name,
            "description": new_group.description,
            "is_private": new_group.is_private,
            "max_members": new_group.max_members,
            "created_by": new_group.created_by,
            "created_at": new_group.created_at,
            "member_count": len(group_data.members) + 1  # +1 for creator
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create group: {str(e)}"
        )

@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
async def get_group_members(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a specific group"""
    try:
        # Check if user is a member of the group
        membership = db.query(group_membership).filter(
            and_(
                group_membership.c.user_id == current_user.id,
                group_membership.c.group_id == group_id
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Get all members
        members = db.query(User, group_membership.c.role, group_membership.c.joined_at).join(
            group_membership, User.id == group_membership.c.user_id
        ).filter(
            group_membership.c.group_id == group_id
        ).all()
        
        result = []
        for user, role, joined_at in members:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "joined_at": joined_at,
                "role": role
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch group members: {str(e)}"
        )

@router.get("/{group_id}/messages", response_model=List[MessageResponse])
async def get_group_messages(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all messages for a specific group"""
    try:
        # Check if user is a member of the group
        membership = db.query(group_membership).filter(
            and_(
                group_membership.c.user_id == current_user.id,
                group_membership.c.group_id == group_id
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Get group messages using raw SQL to avoid pagination issues
        from sqlalchemy import text
        
        query = text("""
            SELECT m.id, m.content, m.sender_id, m.room, m.group_id, m.timestamp, u.username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.group_id = :group_id
            ORDER BY m.timestamp ASC
        """)
        
        result = db.execute(query, {"group_id": group_id}).fetchall()
        
        messages = []
        for row in result:
            messages.append(MessageResponse(
                id=row.id,
                content=row.content,
                sender=row.username,
                timestamp=row.timestamp,
                room=row.room,
                group_id=row.group_id,
                isPrivate=False
            ))
        
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch group messages: {str(e)}"
        )

@router.delete("/{group_id}/leave")
async def leave_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a group"""
    try:
        # Check if user is a member of the group
        membership = db.query(group_membership).filter(
            and_(
                group_membership.c.user_id == current_user.id,
                group_membership.c.group_id == group_id
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not a member of this group"
            )
        
        # Get group and user membership info
        group = db.query(GroupChat).filter(GroupChat.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
            
        user_membership = db.query(group_membership).filter(
            and_(
                group_membership.c.group_id == group_id,
                group_membership.c.user_id == current_user.id
            )
        ).first()
        
        print(f"Debug: User {current_user.id} leaving group {group_id}")
        print(f"Debug: Group created_by: {group.created_by}")
        print(f"Debug: User membership role: {user_membership.role if user_membership else 'None'}")
        
        is_owner = group.created_by == current_user.id
        
        if is_owner:
            print("Debug: User is owner, transferring ownership...")
            
            # First, try to find another admin (excluding current owner)
            other_admins = db.execute(
                select(group_membership.c.user_id).where(
                    and_(
                        group_membership.c.group_id == group_id,
                        group_membership.c.user_id != current_user.id,
                        group_membership.c.role == "admin"
                    )
                )
            ).first()
            
            print(f"Debug: Found other admins: {other_admins}")
            
            if other_admins:
                # Transfer ownership to first admin found
                new_owner_id = other_admins[0]  # Get the user_id from the result
                print(f"Debug: Transferring ownership to admin {new_owner_id}")
                
                # Update group_membership table - promote admin to owner
                db.execute(
                    group_membership.update().where(
                        and_(
                            group_membership.c.user_id == new_owner_id,
                            group_membership.c.group_id == group_id
                        )
                    ).values(role="owner")
                )
                
                # Update created_by field in group_chats table
                db.execute(
                    update(GroupChat).where(GroupChat.id == group_id).values(created_by=new_owner_id)
                )
                
                print(f"Debug: Successfully transferred ownership to {new_owner_id}")
                
            else:
                # No other admins, check if there are other members
                other_members = db.execute(
                    select(group_membership.c.user_id).where(
                        and_(
                            group_membership.c.group_id == group_id,
                            group_membership.c.user_id != current_user.id
                        )
                    )
                ).first()
                
                print(f"Debug: Found other members: {other_members}")

                if other_members:
                    # Promote first member to owner
                    new_owner_id = other_members[0]  # Get the user_id from the result
                    print(f"Debug: Promoting member {new_owner_id} to owner")
                    
                    # Update group_membership table - promote member to owner
                    db.execute(
                        group_membership.update().where(
                            and_(
                                group_membership.c.user_id == new_owner_id,
                                group_membership.c.group_id == group_id
                            )
                        ).values(role="owner")
                    )
                    
                    # Update created_by field in group_chats table
                    db.execute(
                        update(GroupChat).where(GroupChat.id == group_id).values(created_by=new_owner_id)
                    )
                    
                    print(f"Debug: Successfully promoted member {new_owner_id} to owner")
                    
                else:
                    # No other members, delete the group
                    print("Debug: No other members, deleting group")
                    db.delete(group)

        # Remove user from group
        db.execute(
            group_membership.delete().where(
                and_(
                    group_membership.c.user_id == current_user.id,
                    group_membership.c.group_id == group_id
                )
            )
        )
        
        db.commit()
        
        # Get remaining group members after user left
        remaining_members = db.query(User.username).join(
            group_membership, User.id == group_membership.c.user_id
        ).filter(group_membership.c.group_id == group_id).all()
        
        remaining_usernames = [member.username for member in remaining_members]
        
        # Prepare group data for WebSocket notification
        group_data = {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "is_private": group.is_private,
            "max_members": group.max_members,
            "created_by": group.created_by,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "user_left": current_user.username  # Include who left the group
        }
        
        # Notify all remaining group members about user leaving
        for username in remaining_usernames:
            await manager.broadcast_group_update(username, group_data, "user_left_group")
        
        # Also notify the user who left to remove group from their list
        await manager.broadcast_group_update(current_user.username, group_data, "removed_from_group")
        return {"message": "Successfully left the group"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave group: {str(e)}"
        )

@router.post("/{group_id}/addmembers")
async def add_member_to_group(
    group_id: int,
    request: AddMembersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add members to a group (admin only)"""
    try:
        # Check if current user is admin/owner of the group
        membership = db.query(group_membership).filter(
            and_(
                group_membership.c.user_id == current_user.id,
                group_membership.c.group_id == group_id,
                or_(
                    group_membership.c.role == "admin",
                    group_membership.c.role == "owner"
                )
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add members to this group"
            )
        
        # Check if group exists
        group = db.query(GroupChat).filter(GroupChat.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        added_members = []
        errors = []
        
        for member_username in request.members:
            try:
                # Find the user to add
                user_to_add = db.query(User).filter(User.username == member_username).first()
                if not user_to_add:
                    errors.append(f"User '{member_username}' not found")
                    continue
                
                # Check if user is already a member
                existing_membership = db.query(group_membership).filter(
                    and_(
                        group_membership.c.user_id == user_to_add.id,
                        group_membership.c.group_id == group_id
                    )
                ).first()
                
                if existing_membership:
                    errors.append(f"User '{member_username}' is already a member of this group")
                    continue
                
                # Add user to group
                new_membership = group_membership.insert().values(
                    user_id=user_to_add.id,
                    group_id=group_id,
                    role="member",
                    joined_at=datetime.now(timezone.utc)
                )
                db.execute(new_membership)
                added_members.append(member_username)
                send_push_to_username(
                            member_username,
                            f"you added to group:{group.name} from {current_user.username}",
                            "Welcome to group",
                            {"sender": current_user.username, "type": "group", "group_name": group.name},
                            db
                        )
                
                # Broadcast group update to the newly added user via WebSocket
                group_data = {
                    "id": group.id,
                    "name": group.name,
                    "description": group.description,
                    "is_private": group.is_private,
                    "max_members": group.max_members,
                    "created_by": group.created_by,
                    "created_at": group.created_at.isoformat() if group.created_at else None,
                    "member_count": len(group.members) + len(added_members)
                }
                await manager.broadcast_group_update(member_username, group_data)
            except Exception as e:
                errors.append(f"Failed to add '{member_username}': {str(e)}")
        
        db.commit()
        
        # Prepare response message
        message = ""
        if added_members:
            message += f"Successfully added {len(added_members)} member(s): {', '.join(added_members)}"
        if errors:
            if message:
                message += ". "
            message += f"Errors: {'; '.join(errors)}"
        
        if not added_members and errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {"message": message, "added_members": added_members, "errors": errors}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add members: {str(e)}"
        )
