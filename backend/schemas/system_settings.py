"""
Pydantic schemas for System Settings API
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SettingDataType(str, Enum):
    """Setting data types"""
    string = "string"
    integer = "integer"
    float = "float"
    boolean = "boolean"
    json = "json"


class SystemSettingCreate(BaseModel):
    """Schema for creating system setting"""
    key: str = Field(..., description="Setting key", max_length=100)
    value: str = Field(..., description="Setting value")
    category: str = Field(..., description="Setting category", max_length=50)
    description: Optional[str] = Field(None, description="Setting description", max_length=500)
    data_type: SettingDataType = Field(SettingDataType.string, description="Data type")
    is_public: bool = Field(False, description="Is setting public")

    @validator('key')
    def validate_key(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Key must contain only alphanumeric characters, underscores, and hyphens')
        return v.lower()


class SystemSettingUpdate(BaseModel):
    """Schema for updating system setting"""
    value: Optional[str] = Field(None, description="Setting value")
    description: Optional[str] = Field(None, description="Setting description", max_length=500)
    is_public: Optional[bool] = Field(None, description="Is setting public")


class SystemSettingResponse(BaseModel):
    """Schema for system setting response"""
    success: bool = Field(True, description="Request success status")
    data: Optional[Dict[str, Any]] = Field(None, description="Setting data")
    message: Optional[str] = Field(None, description="Response message")


class SystemSettingsListResponse(BaseModel):
    """Schema for system settings list response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="List data with pagination")


class SystemSettingsBulkUpdateRequest(BaseModel):
    """Schema for bulk system settings update"""
    settings: Dict[str, str] = Field(..., description="Settings to update (key: value)")

    @validator('settings')
    def validate_settings(cls, v):
        if not v:
            raise ValueError('At least one setting required')
        if len(v) > 50:
            raise ValueError('Maximum 50 settings per bulk operation')
        return v


class SystemConfigurationResponse(BaseModel):
    """Schema for system configuration response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="Configuration data")


# Additional schemas for detailed responses
class SystemSettingDetail(BaseModel):
    """Detailed system setting schema"""
    id: int
    key: str
    value: str
    category: str
    description: Optional[str]
    data_type: str
    is_public: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SystemInfo(BaseModel):
    """Schema for system information"""
    total_settings: int
    categories_count: int
    public_settings: int
    private_settings: int


class ConfigurationData(BaseModel):
    """Schema for configuration data"""
    configuration: Dict[str, Any]
    system_info: SystemInfo
    user_role: str
    timestamp: str 