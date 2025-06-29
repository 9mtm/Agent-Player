"""
Licensing API Endpoints - Deployment-Only Licensing System
Author: Agent Player Development Team
Description: License validation required only for production deployment
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import hashlib
import platform
import uuid
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/licensing", tags=["licensing"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class LicenseValidationRequest(BaseModel):
    license_key: str
    hardware_fingerprint: Optional[str] = None
    deployment_environment: str = "production"  # local, staging, production
    
class LicenseActivationRequest(BaseModel):
    license_key: str
    server_info: Dict[str, Any]
    deployment_type: str = "production"  # docker, server, cloud
    
class LicenseStatusResponse(BaseModel):
    is_valid: bool
    license_type: str
    expires_at: Optional[datetime]
    features: List[str]
    deployment_allowed: bool
    message: str

class HardwareInfoResponse(BaseModel):
    hardware_fingerprint: str
    server_info: Dict[str, Any]
    deployment_ready: bool

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def is_development_environment() -> bool:
    """Check if running in development environment"""
    return (
        os.getenv("ENVIRONMENT", "development") in ["development", "dev", "local"] or
        os.getenv("UVICORN_HOST") == "127.0.0.1" or
        os.getenv("DEBUG", "").lower() == "true"
    )

def generate_hardware_fingerprint() -> str:
    """Generate hardware fingerprint for deployment validation"""
    try:
        # Get system information
        system_info = {
            "platform": platform.system(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "node": platform.node(),
        }
        
        # Create fingerprint
        fingerprint_data = json.dumps(system_info, sort_keys=True)
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:32]
    except Exception:
        return str(uuid.uuid4())[:32]

def validate_license_key(license_key: str) -> Dict[str, Any]:
    """Validate license key format and return license info"""
    # Basic license key validation (implement your logic)
    if not license_key or len(license_key) < 16:
        return {"valid": False, "message": "Invalid license key format"}
    
    # For development - mock license validation
    if is_development_environment():
        return {
            "valid": True,
            "type": "development",
            "features": ["all_features"],
            "expires_at": datetime.now() + timedelta(days=365),
            "deployment_allowed": False  # Dev doesn't need deployment license
        }
    
    # Production license validation (implement real validation)
    # This would connect to your licensing server
    mock_licenses = {
        "DPRO-AGENT-PROD-2024": {
            "valid": True,
            "type": "production",
            "features": ["training_lab", "unlimited_agents", "premium_models"],
            "expires_at": datetime.now() + timedelta(days=365),
            "deployment_allowed": True
        }
    }
    
    license_info = mock_licenses.get(license_key)
    if license_info:
        return license_info
    else:
        return {"valid": False, "message": "License key not found"}

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/validate", response_model=LicenseStatusResponse)
async def validate_license(
    request: LicenseValidationRequest
) -> LicenseStatusResponse:
    """
    Validate license key - Required only for production deployment
    """
    try:
        # Development environment bypass
        if is_development_environment():
            return LicenseStatusResponse(
                is_valid=True,
                license_type="development",
                expires_at=datetime.now() + timedelta(days=365),
                features=["all_features_unlocked"],
                deployment_allowed=False,
                message="Development environment - no license required"
            )
        
        # Production environment requires valid license
        license_info = validate_license_key(request.license_key)
        
        if not license_info["valid"]:
            return LicenseStatusResponse(
                is_valid=False,
                license_type="none",
                expires_at=None,
                features=[],
                deployment_allowed=False,
                message=license_info.get("message", "Invalid license")
            )
        
        return LicenseStatusResponse(
            is_valid=True,
            license_type=license_info["type"],
            expires_at=license_info["expires_at"],
            features=license_info["features"],
            deployment_allowed=license_info["deployment_allowed"],
            message="License validated successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"License validation failed: {str(e)}"
        )

@router.get("/status", response_model=LicenseStatusResponse)
async def get_license_status() -> LicenseStatusResponse:
    """
    Get current license status
    """
    try:
        # Development environment
        if is_development_environment():
            return LicenseStatusResponse(
                is_valid=True,
                license_type="development",
                expires_at=datetime.now() + timedelta(days=365),
                features=["all_features_unlocked"],
                deployment_allowed=False,
                message="Development mode - all features available"
            )
        
        # Production environment - check for license
        license_key = os.getenv("DPRO_AGENT_LICENSE_KEY")
        if not license_key:
            return LicenseStatusResponse(
                is_valid=False,
                license_type="none",
                expires_at=None,
                features=[],
                deployment_allowed=False,
                message="No license key found - deployment not allowed"
            )
        
        license_info = validate_license_key(license_key)
        
        return LicenseStatusResponse(
            is_valid=license_info["valid"],
            license_type=license_info.get("type", "none"),
            expires_at=license_info.get("expires_at"),
            features=license_info.get("features", []),
            deployment_allowed=license_info.get("deployment_allowed", False),
            message="Production license status retrieved"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get license status: {str(e)}"
        )

@router.post("/activate", response_model=Dict[str, Any])
async def activate_license(
    request: LicenseActivationRequest
) -> Dict[str, Any]:
    """
    Activate license for production deployment
    """
    try:
        # Development environment doesn't need activation
        if is_development_environment():
            return {
                "success": False,
                "message": "License activation not required in development environment",
                "activation_id": None
            }
        
        # Validate license
        license_info = validate_license_key(request.license_key)
        
        if not license_info["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid license key"
            )
        
        # Generate activation
        activation_id = f"ACT_{uuid.uuid4().hex[:16].upper()}"
        hardware_fp = generate_hardware_fingerprint()
        
        # Store activation (implement your storage logic)
        activation_data = {
            "activation_id": activation_id,
            "license_key": request.license_key,
            "hardware_fingerprint": hardware_fp,
            "server_info": request.server_info,
            "deployment_type": request.deployment_type,
            "activated_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": "License activated successfully for production deployment",
            "activation_id": activation_id,
            "hardware_fingerprint": hardware_fp,
            "features_unlocked": license_info["features"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"License activation failed: {str(e)}"
        )

@router.get("/hardware-info", response_model=HardwareInfoResponse)
async def get_hardware_info() -> HardwareInfoResponse:
    """
    Get hardware fingerprint for deployment licensing
    """
    try:
        hardware_fp = generate_hardware_fingerprint()
        
        server_info = {
            "platform": platform.system(),
            "platform_version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "node_name": platform.node(),
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "is_development": is_development_environment()
        }
        
        return HardwareInfoResponse(
            hardware_fingerprint=hardware_fp,
            server_info=server_info,
            deployment_ready=not is_development_environment()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get hardware info: {str(e)}"
        )

@router.get("/environment-check")
async def check_environment() -> Dict[str, Any]:
    """
    Check if current environment requires licensing
    """
    try:
        is_dev = is_development_environment()
        
        return {
            "environment": os.getenv("ENVIRONMENT", "development"),
            "is_development": is_dev,
            "requires_license": not is_dev,
            "license_status": "not_required" if is_dev else "required",
            "message": "Development environment - no license needed" if is_dev else "Production environment - license required for deployment"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Environment check failed: {str(e)}"
        )

@router.get("/features")
async def get_available_features() -> Dict[str, Any]:
    """
    Get available features based on license
    """
    try:
        # Development environment - all features available
        if is_development_environment():
            return {
                "environment": "development",
                "all_features_unlocked": True,
                "features": {
                    "training_lab": {"enabled": True, "description": "AI Agent Training Laboratory"},
                    "unlimited_agents": {"enabled": True, "description": "Create unlimited AI agents"},
                    "premium_models": {"enabled": True, "description": "Access to premium AI models"},
                    "advanced_analytics": {"enabled": True, "description": "Advanced usage analytics"},
                    "api_access": {"enabled": True, "description": "Full API access"},
                    "export_import": {"enabled": True, "description": "Export/Import configurations"},
                    "team_collaboration": {"enabled": True, "description": "Team collaboration features"},
                    "priority_support": {"enabled": True, "description": "Priority customer support"}
                },
                "message": "Development mode - all features available"
            }
        
        # Production environment - check license
        license_key = os.getenv("DPRO_AGENT_LICENSE_KEY")
        license_info = validate_license_key(license_key) if license_key else {"valid": False}
        
        if not license_info["valid"]:
            return {
                "environment": "production",
                "all_features_unlocked": False,
                "features": {},
                "message": "No valid license - deployment blocked"
            }
        
        # Licensed features
        licensed_features = license_info.get("features", [])
        feature_map = {
            "training_lab": "AI Agent Training Laboratory",
            "unlimited_agents": "Create unlimited AI agents", 
            "premium_models": "Access to premium AI models",
            "advanced_analytics": "Advanced usage analytics",
            "api_access": "Full API access",
            "export_import": "Export/Import configurations",
            "team_collaboration": "Team collaboration features",
            "priority_support": "Priority customer support"
        }
        
        enabled_features = {}
        for feature in licensed_features:
            if feature in feature_map:
                enabled_features[feature] = {
                    "enabled": True,
                    "description": feature_map[feature]
                }
        
        return {
            "environment": "production",
            "all_features_unlocked": len(enabled_features) == len(feature_map),
            "features": enabled_features,
            "license_type": license_info.get("type", "none"),
            "message": f"Licensed features: {', '.join(enabled_features.keys())}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get features: {str(e)}"
        )

@router.post("/deployment-check")
async def check_deployment_readiness(
    server_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Check if system is ready for production deployment
    """
    try:
        # Development environment
        if is_development_environment():
            return {
                "deployment_ready": False,
                "environment": "development",
                "message": "Development environment - deployment check not applicable",
                "requirements": ["Switch to production environment", "Obtain production license"]
            }
        
        # Production environment checks
        license_key = os.getenv("DPRO_AGENT_LICENSE_KEY")
        
        checks = {
            "license_present": bool(license_key),
            "license_valid": False,
            "hardware_compatible": True,
            "environment_configured": bool(os.getenv("ENVIRONMENT") == "production")
        }
        
        if checks["license_present"]:
            license_info = validate_license_key(license_key)
            checks["license_valid"] = license_info["valid"]
        
        all_checks_passed = all(checks.values())
        
        requirements = []
        if not checks["license_present"]:
            requirements.append("Set DPRO_AGENT_LICENSE_KEY environment variable")
        if not checks["license_valid"]:
            requirements.append("Provide valid production license key")
        if not checks["environment_configured"]:
            requirements.append("Set ENVIRONMENT=production")
        
        return {
            "deployment_ready": all_checks_passed,
            "environment": "production",
            "checks": checks,
            "requirements": requirements,
            "message": "Deployment ready" if all_checks_passed else "Deployment requirements not met",
            "server_info": server_info,
            "hardware_fingerprint": generate_hardware_fingerprint()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deployment check failed: {str(e)}"
        )

@router.get("/deployment-guide")
async def get_deployment_guide() -> Dict[str, Any]:
    """
    Get deployment guide and licensing instructions
    """
    return {
        "title": "Agent Player Deployment Guide",
        "licensing_model": "Deployment-Only Licensing",
        "description": "License required only for production deployment",
        
        "development": {
            "license_required": False,
            "features": "All features unlocked",
            "instructions": [
                "Clone repository",
                "Install dependencies: pip install -r requirements.txt",
                "Run locally: python backend/main.py",
                "Access at: http://localhost:8000"
            ]
        },
        
        "production_deployment": {
            "license_required": True,
            "steps": [
                {
                    "step": 1,
                    "title": "Obtain Production License",
                    "description": "Contact sales for production license key",
                    "contact": "sales@dpro-agent.com"
                },
                {
                    "step": 2,
                    "title": "Set Environment Variables",
                    "description": "Configure production environment",
                    "variables": {
                        "ENVIRONMENT": "production",
                        "DPRO_AGENT_LICENSE_KEY": "your-license-key-here"
                    }
                },
                {
                    "step": 3,
                    "title": "Validate License",
                    "description": "Check license before deployment",
                    "endpoint": "GET /api/licensing/status"
                },
                {
                    "step": 4,
                    "title": "Deploy Application",
                    "description": "Deploy with valid license",
                    "note": "Application will not start without valid license in production"
                }
            ]
        },
        
        "license_types": {
            "development": {
                "price": "Free",
                "features": ["All features", "Local development only", "No deployment rights"]
            },
            "production": {
                "price": "Contact Sales",
                "features": ["All features", "Production deployment", "Commercial use", "Support included"]
            }
        },
        
        "support": {
            "documentation": "https://docs.dpro-agent.com",
            "sales": "sales@dpro-agent.com",
            "technical": "support@dpro-agent.com"
        }
    } 