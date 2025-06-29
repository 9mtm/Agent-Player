"""
System Settings API Endpoints
Provides operations for system configuration and settings management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, update
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import json

from core.dependencies import get_db, get_current_user
from models.database import User, SystemSettings
from schemas.system_settings import (
    SystemSettingCreate,
    SystemSettingUpdate,
    SystemSettingResponse,
    SystemSettingsListResponse,
    SystemSettingsBulkUpdateRequest,
    SystemConfigurationResponse
)

router = APIRouter(prefix="/system-settings", tags=["System Settings"])
logger = logging.getLogger(__name__)

# Default system settings categories
SETTING_CATEGORIES = {
    "general": "General Settings",
    "security": "Security Settings", 
    "email": "Email Configuration",
    "storage": "Storage Settings",
    "api": "API Configuration",
    "logging": "Logging Settings",
    "backup": "Backup Configuration",
    "performance": "Performance Settings",
    "licensing": "License Settings",
    "integrations": "Third-party Integrations"
}

@router.get("/", response_model=SystemSettingsListResponse)
async def list_system_settings(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in key or description"),
    include_sensitive: bool = Query(False, description="Include sensitive settings (admin only)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List system settings with pagination and filtering
    
    Regular users see only public settings, admins see all
    """
    try:
        # Build query based on user role
        if current_user.role == "admin":
            if include_sensitive:
                query = select(SystemSetting)
            else:
                query = select(SystemSetting).where(SystemSetting.is_public == True)
        else:
            # Regular users see only public settings
            query = select(SystemSetting).where(SystemSetting.is_public == True)
        
        # Apply filters
        if category and category in SETTING_CATEGORIES:
            query = query.where(SystemSetting.category == category)
        
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (SystemSetting.key.ilike(search_filter)) |
                (SystemSetting.description.ilike(search_filter))
            )
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(SystemSetting.category, SystemSetting.key)
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        settings = result.scalars().all()
        
        # Group settings by category
        settings_by_category = {}
        for setting in settings:
            if setting.category not in settings_by_category:
                settings_by_category[setting.category] = []
            settings_by_category[setting.category].append({
                "id": setting.id,
                "key": setting.key,
                "value": setting.value,
                "description": setting.description,
                "data_type": setting.data_type,
                "is_public": setting.is_public,
                "updated_at": setting.updated_at
            })
        
        logger.info(f"Listed {len(settings)} system settings for user {current_user.id}")
        
        return SystemSettingsListResponse(
            success=True,
            data={
                "settings": settings_by_category,
                "categories": SETTING_CATEGORIES,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(settings)) < total,
                "filters_applied": {
                    "category": category,
                    "search": search,
                    "include_sensitive": include_sensitive and current_user.role == "admin"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing system settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=SystemSettingResponse, status_code=201)
async def create_system_setting(
    setting_data: SystemSettingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new system setting (admin only)
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only administrators can create system settings")
        
        # Check if setting key already exists
        existing_query = select(SystemSetting).where(SystemSetting.key == setting_data.key)
        existing_result = await db.execute(existing_query)
        existing_setting = existing_result.scalar_one_or_none()
        
        if existing_setting:
            raise HTTPException(status_code=400, detail="Setting key already exists")
        
        # Validate category
        if setting_data.category not in SETTING_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        # Create setting
        setting = SystemSetting(
            key=setting_data.key,
            value=setting_data.value,
            category=setting_data.category,
            description=setting_data.description,
            data_type=setting_data.data_type,
            is_public=setting_data.is_public,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
        
        logger.info(f"Created system setting {setting.key} by admin {current_user.id}")
        
        return SystemSettingResponse(
            success=True,
            data=setting,
            message="System setting created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating system setting: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{setting_key}", response_model=SystemSettingResponse)
async def get_system_setting(
    setting_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get specific system setting value
    """
    try:
        # Build query based on user role
        if current_user.role == "admin":
            query = select(SystemSetting).where(SystemSetting.key == setting_key)
        else:
            query = select(SystemSetting).where(
                and_(SystemSetting.key == setting_key, SystemSetting.is_public == True)
            )
        
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found or access denied")
        
        logger.info(f"Retrieved system setting {setting_key} for user {current_user.id}")
        
        return SystemSettingResponse(
            success=True,
            data=setting
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving system setting {setting_key}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{setting_key}", response_model=SystemSettingResponse)
async def update_system_setting(
    setting_key: str,
    setting_data: SystemSettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update system setting value (admin only)
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only administrators can update system settings")
        
        # Get existing setting
        query = select(SystemSetting).where(SystemSetting.key == setting_key)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Update setting
        if setting_data.value is not None:
            setting.value = setting_data.value
        if setting_data.description is not None:
            setting.description = setting_data.description
        if setting_data.is_public is not None:
            setting.is_public = setting_data.is_public
        
        setting.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(setting)
        
        logger.info(f"Updated system setting {setting_key} by admin {current_user.id}")
        
        return SystemSettingResponse(
            success=True,
            data=setting,
            message="System setting updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating system setting {setting_key}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{setting_key}")
async def delete_system_setting(
    setting_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete system setting (admin only)
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only administrators can delete system settings")
        
        # Get existing setting
        query = select(SystemSetting).where(SystemSetting.key == setting_key)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Prevent deletion of critical settings
        critical_settings = ["app_name", "app_version", "session_timeout", "password_min_length"]
        if setting_key in critical_settings:
            raise HTTPException(status_code=400, detail="Cannot delete critical system setting")
        
        await db.delete(setting)
        await db.commit()
        
        logger.info(f"Deleted system setting {setting_key} by admin {current_user.id}")
        
        return {
            "success": True,
            "message": "System setting deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting system setting {setting_key}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/categories/list")
async def get_setting_categories(
    current_user: User = Depends(get_current_user)
):
    """
    Get available setting categories
    """
    return {
        "success": True,
        "data": {
            "categories": SETTING_CATEGORIES,
            "count": len(SETTING_CATEGORIES)
        }
    }


@router.get("/configuration/current", response_model=SystemConfigurationResponse)
async def get_current_configuration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current system configuration summary
    """
    try:
        # Get all public settings for regular users, all settings for admins
        if current_user.role == "admin":
            query = select(SystemSetting)
        else:
            query = select(SystemSetting).where(SystemSetting.is_public == True)
        
        result = await db.execute(query)
        settings = result.scalars().all()
        
        # Build configuration object
        configuration = {}
        for setting in settings:
            configuration[setting.key] = {
                "value": setting.value,
                "category": setting.category,
                "description": setting.description,
                "data_type": setting.data_type,
                "is_public": setting.is_public,
                "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
            }
        
        # Add system information
        system_info = {
            "total_settings": len(settings),
            "categories_count": len(set(s.category for s in settings)),
            "public_settings": len([s for s in settings if s.is_public]),
            "private_settings": len([s for s in settings if not s.is_public]) if current_user.role == "admin" else 0
        }
        
        logger.info(f"Retrieved system configuration for user {current_user.id}")
        
        return SystemConfigurationResponse(
            success=True,
            data={
                "configuration": configuration,
                "system_info": system_info,
                "user_role": current_user.role,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting system configuration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 