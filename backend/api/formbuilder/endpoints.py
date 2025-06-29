"""
FormBuilder API Endpoints
Complete form building and management system
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from models.shared import SuccessResponse
from core.dependencies import get_current_user, get_db
from pydantic import BaseModel
from datetime import datetime
import uuid

# Initialize router
router = APIRouter(tags=["FormBuilder"])

# Pydantic models for FormBuilder
class FormField(BaseModel):
    id: str
    type: str  # text, number, email, textarea, select, checkbox, radio, date, file
    label: str
    placeholder: Optional[str] = None
    required: bool = False
    options: Optional[List[str]] = None  # For select, radio, checkbox
    validation_rules: Optional[Dict[str, Any]] = None
    default_value: Optional[str] = None
    help_text: Optional[str] = None

class FormCreate(BaseModel):
    name: str
    description: Optional[str] = None
    fields: List[FormField]
    settings: Optional[Dict[str, Any]] = None
    is_public: bool = False

class FormUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[FormField]] = None
    settings: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class FormSubmission(BaseModel):
    form_id: str
    data: Dict[str, Any]
    submitted_by: Optional[str] = None

# In-memory storage for development (replace with database later)
forms_storage = {}
submissions_storage = {}

@router.get("/forms", response_model=SuccessResponse)
async def list_forms(
    current_user: Dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    """List user's forms"""
    try:
        user_id = current_user["user_id"]
        user_forms = [
            form for form in forms_storage.values() 
            if form["user_id"] == user_id
        ]
        
        # Apply search filter
        if search:
            user_forms = [
                form for form in user_forms 
                if search.lower() in form["name"].lower() or 
                   search.lower() in (form.get("description", "")).lower()
            ]
        
        # Apply pagination
        total = len(user_forms)
        paginated_forms = user_forms[skip:skip + limit]
        
        return SuccessResponse(
            message=f"Found {len(paginated_forms)} forms",
            data={
                "forms": paginated_forms,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": skip + limit < total
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forms", response_model=SuccessResponse, status_code=201)
async def create_form(
    form_data: FormCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create new form"""
    try:
        form_id = str(uuid.uuid4())
        user_id = current_user["user_id"]
        
        # Validate fields
        for field in form_data.fields:
            if not field.id or not field.type or not field.label:
                raise HTTPException(
                    status_code=400, 
                    detail="Each field must have id, type, and label"
                )
        
        new_form = {
            "id": form_id,
            "name": form_data.name,
            "description": form_data.description,
            "fields": [field.dict() for field in form_data.fields],
            "settings": form_data.settings or {},
            "is_public": form_data.is_public,
            "user_id": user_id,
            "submission_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        forms_storage[form_id] = new_form
        
        return SuccessResponse(
            message="Form created successfully",
            data={"form_id": form_id, "form": new_form}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forms/{form_id}", response_model=SuccessResponse)
async def get_form(
    form_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get specific form"""
    try:
        if form_id not in forms_storage:
            raise HTTPException(status_code=404, detail="Form not found")
        
        form = forms_storage[form_id]
        user_id = current_user["user_id"]
        
        # Check if user owns form or if form is public
        if form["user_id"] != user_id and not form["is_public"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return SuccessResponse(
            message="Form retrieved successfully",
            data=form
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/forms/{form_id}", response_model=SuccessResponse)
async def update_form(
    form_id: str,
    form_data: FormUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update existing form"""
    try:
        if form_id not in forms_storage:
            raise HTTPException(status_code=404, detail="Form not found")
        
        form = forms_storage[form_id]
        user_id = current_user["user_id"]
        
        # Check ownership
        if form["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update fields
        if form_data.name is not None:
            form["name"] = form_data.name
        if form_data.description is not None:
            form["description"] = form_data.description
        if form_data.fields is not None:
            form["fields"] = [field.dict() for field in form_data.fields]
        if form_data.settings is not None:
            form["settings"] = form_data.settings
        if form_data.is_public is not None:
            form["is_public"] = form_data.is_public
        
        form["updated_at"] = datetime.utcnow().isoformat()
        
        return SuccessResponse(
            message="Form updated successfully",
            data=form
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/forms/{form_id}", response_model=SuccessResponse)
async def delete_form(
    form_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete form"""
    try:
        if form_id not in forms_storage:
            raise HTTPException(status_code=404, detail="Form not found")
        
        form = forms_storage[form_id]
        user_id = current_user["user_id"]
        
        # Check ownership
        if form["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete form and related submissions
        del forms_storage[form_id]
        submissions_storage = {
            k: v for k, v in submissions_storage.items() 
            if v["form_id"] != form_id
        }
        
        return SuccessResponse(
            message="Form deleted successfully",
            data={"form_id": form_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forms/{form_id}/submit", response_model=SuccessResponse, status_code=201)
async def submit_form(
    form_id: str,
    submission: FormSubmission,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Submit form data"""
    try:
        if form_id not in forms_storage:
            raise HTTPException(status_code=404, detail="Form not found")
        
        form = forms_storage[form_id]
        
        # Validate submission data against form fields
        required_fields = [
            field["id"] for field in form["fields"] 
            if field.get("required", False)
        ]
        
        for required_field in required_fields:
            if required_field not in submission.data or not submission.data[required_field]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Required field '{required_field}' is missing"
                )
        
        submission_id = str(uuid.uuid4())
        new_submission = {
            "id": submission_id,
            "form_id": form_id,
            "data": submission.data,
            "submitted_by": current_user["user_id"] if current_user else "anonymous",
            "submitted_at": datetime.utcnow().isoformat()
        }
        
        submissions_storage[submission_id] = new_submission
        
        # Update form submission count
        form["submission_count"] += 1
        
        return SuccessResponse(
            message="Form submitted successfully",
            data={
                "submission_id": submission_id,
                "form_id": form_id,
                "submitted_at": new_submission["submitted_at"]
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forms/{form_id}/submissions", response_model=SuccessResponse)
async def get_form_submissions(
    form_id: str,
    current_user: Dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """Get form submissions"""
    try:
        if form_id not in forms_storage:
            raise HTTPException(status_code=404, detail="Form not found")
        
        form = forms_storage[form_id]
        user_id = current_user["user_id"]
        
        # Check ownership
        if form["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get submissions for this form
        form_submissions = [
            submission for submission in submissions_storage.values()
            if submission["form_id"] == form_id
        ]
        
        # Sort by submission time (newest first)
        form_submissions.sort(
            key=lambda x: x["submitted_at"], 
            reverse=True
        )
        
        # Apply pagination
        total = len(form_submissions)
        paginated_submissions = form_submissions[skip:skip + limit]
        
        return SuccessResponse(
            message=f"Found {len(paginated_submissions)} submissions",
            data={
                "submissions": paginated_submissions,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": skip + limit < total
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates", response_model=SuccessResponse)
async def get_form_templates():
    """Get form templates"""
    try:
        templates = [
            {
                "id": "contact_form",
                "name": "Contact Form",
                "description": "Basic contact form with name, email, and message",
                "fields": [
                    {
                        "id": "name",
                        "type": "text",
                        "label": "Full Name",
                        "required": True,
                        "placeholder": "Enter your full name"
                    },
                    {
                        "id": "email",
                        "type": "email",
                        "label": "Email Address",
                        "required": True,
                        "placeholder": "Enter your email"
                    },
                    {
                        "id": "message",
                        "type": "textarea",
                        "label": "Message",
                        "required": True,
                        "placeholder": "Enter your message"
                    }
                ]
            },
            {
                "id": "feedback_form",
                "name": "Feedback Form",
                "description": "Customer feedback form with rating and comments",
                "fields": [
                    {
                        "id": "rating",
                        "type": "select",
                        "label": "Overall Rating",
                        "required": True,
                        "options": ["Excellent", "Good", "Fair", "Poor"]
                    },
                    {
                        "id": "experience",
                        "type": "radio",
                        "label": "How was your experience?",
                        "required": True,
                        "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]
                    },
                    {
                        "id": "comments",
                        "type": "textarea",
                        "label": "Additional Comments",
                        "required": False,
                        "placeholder": "Share your thoughts..."
                    }
                ]
            },
            {
                "id": "registration_form",
                "name": "Registration Form",
                "description": "User registration form with personal details",
                "fields": [
                    {
                        "id": "first_name",
                        "type": "text",
                        "label": "First Name",
                        "required": True
                    },
                    {
                        "id": "last_name",
                        "type": "text",
                        "label": "Last Name",
                        "required": True
                    },
                    {
                        "id": "email",
                        "type": "email",
                        "label": "Email Address",
                        "required": True
                    },
                    {
                        "id": "phone",
                        "type": "text",
                        "label": "Phone Number",
                        "required": False
                    },
                    {
                        "id": "birth_date",
                        "type": "date",
                        "label": "Date of Birth",
                        "required": False
                    },
                    {
                        "id": "terms",
                        "type": "checkbox",
                        "label": "I agree to the terms and conditions",
                        "required": True
                    }
                ]
            }
        ]
        
        return SuccessResponse(
            message=f"Found {len(templates)} templates",
            data={"templates": templates}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics", response_model=SuccessResponse)
async def get_form_analytics(
    current_user: Dict = Depends(get_current_user)
):
    """Get form analytics for current user"""
    try:
        user_id = current_user["user_id"]
        
        # Get user's forms
        user_forms = [
            form for form in forms_storage.values() 
            if form["user_id"] == user_id
        ]
        
        # Get user's submissions
        user_submissions = [
            submission for submission in submissions_storage.values()
            if forms_storage.get(submission["form_id"], {}).get("user_id") == user_id
        ]
        
        # Calculate analytics
        total_forms = len(user_forms)
        total_submissions = len(user_submissions)
        avg_submissions_per_form = total_submissions / total_forms if total_forms > 0 else 0
        
        # Most popular forms
        form_submission_counts = {}
        for submission in user_submissions:
            form_id = submission["form_id"]
            form_submission_counts[form_id] = form_submission_counts.get(form_id, 0) + 1
        
        popular_forms = sorted(
            [(forms_storage[form_id]["name"], count) 
             for form_id, count in form_submission_counts.items()],
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        return SuccessResponse(
            message="Analytics retrieved successfully",
            data={
                "total_forms": total_forms,
                "total_submissions": total_submissions,
                "average_submissions_per_form": round(avg_submissions_per_form, 2),
                "popular_forms": popular_forms,
                "recent_activity": []  # TODO: Implement recent activity tracking
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
