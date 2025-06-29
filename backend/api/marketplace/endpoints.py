"""
Marketplace API Endpoints - Agent and Template Marketplace
Author: Agent Player Development Team
Description: Complete marketplace for sharing and discovering AI agents and training templates
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

router = APIRouter(tags=["Marketplace"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class MarketplaceItemResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str
    subcategory: Optional[str]
    type: str  # agent, template, tool
    author_name: str
    author_id: int
    price: float
    rating: float
    reviews_count: int
    downloads_count: int
    is_featured: bool
    is_verified: bool
    tags: List[str]
    thumbnail_url: Optional[str]
    created_at: datetime
    updated_at: datetime

class AgentMarketplaceResponse(MarketplaceItemResponse):
    model_provider: str
    model_name: str
    capabilities: List[str]
    use_cases: List[str]
    demo_available: bool

class TemplateMarketplaceResponse(MarketplaceItemResponse):
    scenarios_count: int
    estimated_time: str
    difficulty: str
    objectives: List[str]

class MarketplaceFilters(BaseModel):
    category: Optional[str] = None
    type: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    rating_min: Optional[float] = None
    is_free: Optional[bool] = None
    is_featured: Optional[bool] = None

class PublishRequest(BaseModel):
    item_id: int
    item_type: str  # agent, template
    name: str
    description: str
    category: str
    subcategory: Optional[str] = None
    price: float = 0.0
    tags: List[str] = Field(default_factory=list)
    is_public: bool = True

class ReviewRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)

class PurchaseRequest(BaseModel):
    payment_method: str = "credits"  # credits, paypal, stripe

# ============================================================================
# MOCK DATA
# ============================================================================

def get_mock_marketplace_items() -> List[Dict[str, Any]]:
    """Mock marketplace items"""
    return [
        {
            "id": 1,
            "name": "Customer Service Pro",
            "description": "Professional customer service agent with advanced conflict resolution",
            "category": "Customer Service",
            "subcategory": "Support",
            "type": "agent",
            "author_name": "ServiceBot Inc",
            "author_id": 101,
            "price": 29.99,
            "rating": 4.8,
            "reviews_count": 127,
            "downloads_count": 1543,
            "is_featured": True,
            "is_verified": True,
            "tags": ["customer-service", "professional", "conflict-resolution"],
            "thumbnail_url": "/static/agents/customer-service-pro.png",
            "model_provider": "openai",
            "model_name": "gpt-4",
            "capabilities": ["Empathy", "Problem Solving", "Professional Communication"],
            "use_cases": ["Customer Support", "Complaint Handling", "Service Recovery"],
            "demo_available": True,
            "created_at": datetime.now() - timedelta(days=30),
            "updated_at": datetime.now() - timedelta(days=5)
        },
        {
            "id": 2,
            "name": "Sales Conversation Master",
            "description": "Expert sales agent for lead qualification and conversion",
            "category": "Sales",
            "subcategory": "Lead Generation",
            "type": "agent",
            "author_name": "SalesAI Pro",
            "author_id": 102,
            "price": 49.99,
            "rating": 4.9,
            "reviews_count": 89,
            "downloads_count": 892,
            "is_featured": True,
            "is_verified": True,
            "tags": ["sales", "conversion", "lead-qualification"],
            "thumbnail_url": "/static/agents/sales-master.png",
            "model_provider": "anthropic",
            "model_name": "claude-3",
            "capabilities": ["Persuasion", "Needs Analysis", "Objection Handling"],
            "use_cases": ["Lead Qualification", "Sales Calls", "Product Demos"],
            "demo_available": True,
            "created_at": datetime.now() - timedelta(days=20),
            "updated_at": datetime.now() - timedelta(days=3)
        },
        {
            "id": 3,
            "name": "Technical Support Training Pack",
            "description": "Comprehensive training scenarios for technical support agents",
            "category": "Training",
            "subcategory": "Technical Support",
            "type": "template",
            "author_name": "TechTraining Hub",
            "author_id": 103,
            "price": 19.99,
            "rating": 4.7,
            "reviews_count": 156,
            "downloads_count": 2341,
            "is_featured": False,
            "is_verified": True,
            "tags": ["technical", "troubleshooting", "training"],
            "thumbnail_url": "/static/templates/tech-support.png",
            "scenarios_count": 25,
            "estimated_time": "3-4 hours",
            "difficulty": "Intermediate",
            "objectives": ["Problem Diagnosis", "Solution Delivery", "Customer Education"],
            "created_at": datetime.now() - timedelta(days=45),
            "updated_at": datetime.now() - timedelta(days=7)
        }
    ]

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/items", response_model=List[MarketplaceItemResponse])
async def get_marketplace_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    rating_min: Optional[float] = Query(None),
    is_free: Optional[bool] = Query(None),
    is_featured: Optional[bool] = Query(None),
    sort_by: str = Query("featured", pattern="^(featured|rating|price|downloads|newest)$")
) -> List[MarketplaceItemResponse]:
    """
    Get marketplace items with filtering and pagination
    """
    try:
        items = get_mock_marketplace_items()
        
        # Apply filters
        filtered_items = items
        
        if search:
            filtered_items = [
                item for item in filtered_items 
                if search.lower() in item["name"].lower() or search.lower() in item["description"].lower()
            ]
        
        if category:
            filtered_items = [item for item in filtered_items if item["category"] == category]
        
        if type:
            filtered_items = [item for item in filtered_items if item["type"] == type]
        
        if price_min is not None:
            filtered_items = [item for item in filtered_items if item["price"] >= price_min]
        
        if price_max is not None:
            filtered_items = [item for item in filtered_items if item["price"] <= price_max]
        
        if rating_min is not None:
            filtered_items = [item for item in filtered_items if item["rating"] >= rating_min]
        
        if is_free is not None:
            if is_free:
                filtered_items = [item for item in filtered_items if item["price"] == 0]
            else:
                filtered_items = [item for item in filtered_items if item["price"] > 0]
        
        if is_featured is not None:
            filtered_items = [item for item in filtered_items if item["is_featured"] == is_featured]
        
        # Sort items
        if sort_by == "rating":
            filtered_items.sort(key=lambda x: x["rating"], reverse=True)
        elif sort_by == "price":
            filtered_items.sort(key=lambda x: x["price"])
        elif sort_by == "downloads":
            filtered_items.sort(key=lambda x: x["downloads_count"], reverse=True)
        elif sort_by == "newest":
            filtered_items.sort(key=lambda x: x["created_at"], reverse=True)
        else:  # featured
            filtered_items.sort(key=lambda x: (x["is_featured"], x["rating"]), reverse=True)
        
        # Convert to response models
        result = []
        for item in filtered_items[skip:skip + limit]:
            result.append(MarketplaceItemResponse(**item))
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get marketplace items: {str(e)}"
        )

@router.get("/items/{item_id}", response_model=Dict[str, Any])
async def get_marketplace_item(item_id: int) -> Dict[str, Any]:
    """
    Get detailed marketplace item information
    """
    try:
        items = get_mock_marketplace_items()
        item = next((item for item in items if item["id"] == item_id), None)
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Marketplace item not found"
            )
        
        # Add detailed information
        detailed_item = {
            **item,
            "detailed_description": "This is a comprehensive description of the marketplace item with features, benefits, and usage instructions.",
            "screenshots": [
                "/static/screenshots/item1_1.png",
                "/static/screenshots/item1_2.png"
            ],
            "changelog": [
                {
                    "version": "1.2.0",
                    "date": datetime.now() - timedelta(days=5),
                    "changes": ["Improved response quality", "Added new scenarios"]
                }
            ],
            "requirements": {
                "minimum_credits": 100,
                "compatible_models": ["gpt-4", "gpt-3.5-turbo"],
                "required_features": ["training_lab"]
            },
            "reviews": [
                {
                    "id": 1,
                    "user_name": "John D.",
                    "rating": 5,
                    "comment": "Excellent agent, very professional responses",
                    "date": datetime.now() - timedelta(days=10)
                },
                {
                    "id": 2,
                    "user_name": "Sarah M.",
                    "rating": 4,
                    "comment": "Good quality but could use more customization options",
                    "date": datetime.now() - timedelta(days=15)
                }
            ],
            "related_items": [
                {"id": 2, "name": "Sales Conversation Master", "price": 49.99},
                {"id": 4, "name": "Customer Service Basic", "price": 9.99}
            ]
        }
        
        return detailed_item
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get marketplace item: {str(e)}"
        )

@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_marketplace_categories() -> List[Dict[str, Any]]:
    """
    Get available marketplace categories
    """
    try:
        categories = [
            {
                "name": "Customer Service",
                "description": "Customer support and service agents",
                "icon": "customer-service",
                "item_count": 45,
                "subcategories": [
                    {"name": "Support", "count": 23},
                    {"name": "Sales", "count": 15},
                    {"name": "Technical", "count": 7}
                ]
            },
            {
                "name": "Sales",
                "description": "Sales and marketing agents",
                "icon": "sales",
                "item_count": 32,
                "subcategories": [
                    {"name": "Lead Generation", "count": 12},
                    {"name": "Conversion", "count": 11},
                    {"name": "Follow-up", "count": 9}
                ]
            },
            {
                "name": "Training",
                "description": "Training templates and scenarios",
                "icon": "training",
                "item_count": 67,
                "subcategories": [
                    {"name": "Customer Service", "count": 25},
                    {"name": "Technical Support", "count": 22},
                    {"name": "Sales Training", "count": 20}
                ]
            },
            {
                "name": "Analytics",
                "description": "Data analysis and reporting agents",
                "icon": "analytics",
                "item_count": 18,
                "subcategories": [
                    {"name": "Business Intelligence", "count": 8},
                    {"name": "Performance Analysis", "count": 6},
                    {"name": "Reporting", "count": 4}
                ]
            }
        ]
        
        return categories
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get categories: {str(e)}"
        )

@router.get("/featured", response_model=List[MarketplaceItemResponse])
async def get_featured_items(limit: int = Query(10, ge=1, le=20)) -> List[MarketplaceItemResponse]:
    """
    Get featured marketplace items
    """
    try:
        items = get_mock_marketplace_items()
        featured_items = [item for item in items if item["is_featured"]]
        
        # Sort by rating and limit
        featured_items.sort(key=lambda x: x["rating"], reverse=True)
        featured_items = featured_items[:limit]
        
        return [MarketplaceItemResponse(**item) for item in featured_items]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get featured items: {str(e)}"
        )

@router.post("/items/{item_id}/purchase", response_model=Dict[str, Any])
async def purchase_item(
    item_id: int,
    request: PurchaseRequest
) -> Dict[str, Any]:
    """
    Purchase marketplace item
    """
    try:
        # Mock purchase process
        items = get_mock_marketplace_items()
        item = next((item for item in items if item["id"] == item_id), None)
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Marketplace item not found"
            )
        
        # Mock purchase validation
        if item["price"] > 0 and request.payment_method == "credits":
            # Check user credits (mock)
            user_credits = 150.0  # Mock user credits
            if user_credits < item["price"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient credits. Required: {item['price']}, Available: {user_credits}"
                )
        
        # Process purchase
        purchase_id = str(uuid.uuid4())
        
        return {
            "purchase_id": purchase_id,
            "item_id": item_id,
            "item_name": item["name"],
            "price_paid": item["price"],
            "payment_method": request.payment_method,
            "status": "completed",
            "download_available": True,
            "access_granted": True,
            "purchase_date": datetime.now(),
            "license": "Standard License - Personal Use"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Purchase failed: {str(e)}"
        )

@router.post("/items/{item_id}/reviews", response_model=Dict[str, Any])
async def add_review(
    item_id: int,
    request: ReviewRequest
) -> Dict[str, Any]:
    """
    Add review for marketplace item
    """
    try:
        # Mock review addition
        review = {
            "id": 123,
            "item_id": item_id,
            "user_name": "Current User",
            "rating": request.rating,
            "comment": request.comment,
            "date": datetime.now(),
            "verified_purchase": True
        }
        
        return {
            "success": True,
            "message": "Review added successfully",
            "review": review
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add review: {str(e)}"
        )

@router.post("/publish", response_model=Dict[str, Any])
async def publish_item(request: PublishRequest) -> Dict[str, Any]:
    """
    Publish item to marketplace
    """
    try:
        # Mock publishing process
        listing_id = str(uuid.uuid4())
        
        return {
            "success": True,
            "listing_id": listing_id,
            "status": "pending_review",
            "message": "Item submitted for marketplace review",
            "estimated_review_time": "24-48 hours",
            "review_criteria": [
                "Quality assessment",
                "Content guidelines compliance",
                "Technical validation",
                "Security review"
            ],
            "next_steps": [
                "Our team will review your submission",
                "You'll receive email notification upon approval",
                "Item will be live in marketplace after approval"
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish item: {str(e)}"
        )

@router.get("/my-purchases", response_model=List[Dict[str, Any]])
async def get_my_purchases() -> List[Dict[str, Any]]:
    """
    Get user's purchased items
    """
    try:
        # Mock user purchases
        purchases = [
            {
                "purchase_id": "purch_123",
                "item_id": 1,
                "item_name": "Customer Service Pro",
                "item_type": "agent",
                "price_paid": 29.99,
                "purchase_date": datetime.now() - timedelta(days=5),
                "status": "active",
                "downloads_used": 1,
                "downloads_remaining": 4,
                "license_expires": datetime.now() + timedelta(days=360),
                "download_url": "/api/marketplace/downloads/agent_1"
            },
            {
                "purchase_id": "purch_124",
                "item_id": 3,
                "item_name": "Technical Support Training Pack",
                "item_type": "template",
                "price_paid": 19.99,
                "purchase_date": datetime.now() - timedelta(days=10),
                "status": "active",
                "downloads_used": 1,
                "downloads_remaining": 9,
                "license_expires": datetime.now() + timedelta(days=355),
                "download_url": "/api/marketplace/downloads/template_3"
            }
        ]
        
        return purchases
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get purchases: {str(e)}"
        )

@router.get("/my-listings", response_model=List[Dict[str, Any]])
async def get_my_listings() -> List[Dict[str, Any]]:
    """
    Get user's marketplace listings
    """
    try:
        # Mock user listings
        listings = [
            {
                "listing_id": "list_456",
                "item_id": 10,
                "item_name": "My Custom Agent",
                "item_type": "agent",
                "status": "published",
                "price": 39.99,
                "rating": 4.6,
                "reviews_count": 23,
                "downloads_count": 145,
                "earnings": 2899.55,
                "published_date": datetime.now() - timedelta(days=30),
                "last_updated": datetime.now() - timedelta(days=3)
            }
        ]
        
        return listings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get listings: {str(e)}"
        )

@router.get("/search", response_model=Dict[str, Any])
async def search_marketplace(
    query: str = Query(..., min_length=1),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
) -> Dict[str, Any]:
    """
    Search marketplace with advanced filters
    """
    try:
        items = get_mock_marketplace_items()
        
        # Simple search implementation
        search_results = []
        for item in items:
            if (query.lower() in item["name"].lower() or 
                query.lower() in item["description"].lower() or
                any(query.lower() in tag.lower() for tag in item["tags"])):
                
                # Apply additional filters
                if category and item["category"] != category:
                    continue
                if type and item["type"] != type:
                    continue
                
                search_results.append(item)
        
        # Sort by relevance (mock scoring)
        search_results.sort(key=lambda x: x["rating"], reverse=True)
        
        return {
            "query": query,
            "total_results": len(search_results),
            "results": [MarketplaceItemResponse(**item) for item in search_results[:limit]],
            "suggestions": [
                "customer service",
                "sales agent",
                "training template",
                "technical support"
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        ) 