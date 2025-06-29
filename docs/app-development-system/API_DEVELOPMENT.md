# 🔌 API Development Guide - Auto-Generated APIs

## Overview
This guide explains how Custom Field Builder Pro automatically generates REST APIs and MCP tools for your applications, including customization options and best practices.

## 🚀 Auto-Generated API Architecture

### Standard API Pattern
```
For each Custom Field Builder app, the system generates:

/api/custom/{app-slug}/
├── GET    /                    # List records with pagination
├── POST   /                    # Create new record
├── GET    /{id}               # Get specific record
├── PUT    /{id}               # Update existing record
├── DELETE /{id}               # Delete record (soft delete)
├── GET    /schema             # Get field schema definition
├── POST   /validate           # Validate data without saving
├── GET    /export             # Export data (CSV, JSON, Excel)
├── POST   /import             # Import data from files
└── GET    /analytics          # Get usage analytics
```

### MCP Tools Pattern
```
For each app, MCP tools are generated:

{app_slug}_create()           # Create new record
{app_slug}_read()             # Read records with filtering
{app_slug}_update()           # Update existing record
{app_slug}_delete()           # Delete record
{app_slug}_analytics()        # Get analytics data
{app_slug}_search()           # Search through records
{app_slug}_execute_code()     # Execute custom Python code
```

## 📋 API Generation Examples

### Example 1: Customer Feedback App

#### Generated API Endpoints
```python
# Auto-generated FastAPI endpoints
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/custom/customer-feedback", tags=["Customer Feedback"])

# Data Models (Auto-generated from fields)
class CustomerFeedbackCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    rating: int = Field(..., ge=1, le=10)
    feedback: str = Field(..., min_length=10, max_length=2000)
    support_type: str = Field(..., regex="^(technical|billing|general)$")
    priority: Optional[str] = Field("medium", regex="^(low|medium|high|urgent)$")
    
    class Config:
        schema_extra = {
            "example": {
                "customer_name": "John Doe",
                "email": "john@example.com",
                "rating": 8,
                "feedback": "Great service, very satisfied with the response time.",
                "support_type": "technical",
                "priority": "medium"
            }
        }

class CustomerFeedbackResponse(BaseModel):
    id: int
    customer_name: str
    email: str
    rating: int
    feedback: str
    support_type: str
    priority: str
    sentiment_analysis: Optional[dict]
    status: str = "open"
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# CRUD Operations
@router.post("/", response_model=CustomerFeedbackResponse, status_code=201)
async def create_feedback(
    feedback_data: CustomerFeedbackCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create new customer feedback with automatic sentiment analysis."""
    
    # Execute custom Python code for sentiment analysis
    sentiment_result = await execute_field_code(
        "sentiment_analysis",
        feedback_data.feedback,
        context={"rating": feedback_data.rating}
    )
    
    # Create database record
    db_feedback = CustomerFeedback(
        **feedback_data.dict(),
        sentiment_analysis=sentiment_result,
        created_by=current_user.id,
        status="open"
    )
    
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    
    # Background tasks (notifications, webhooks, etc.)
    background_tasks.add_task(send_notification_email, feedback_data.email)
    background_tasks.add_task(trigger_webhooks, "feedback_created", db_feedback.id)
    
    return db_feedback

@router.get("/", response_model=List[CustomerFeedbackResponse])
async def list_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    support_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    rating_min: Optional[int] = Query(None, ge=1, le=10),
    rating_max: Optional[int] = Query(None, ge=1, le=10),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List customer feedback with advanced filtering and search."""
    
    query = db.query(CustomerFeedback)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                CustomerFeedback.customer_name.ilike(f"%{search}%"),
                CustomerFeedback.feedback.ilike(f"%{search}%"),
                CustomerFeedback.email.ilike(f"%{search}%")
            )
        )
    
    if support_type:
        query = query.filter(CustomerFeedback.support_type == support_type)
    
    if priority:
        query = query.filter(CustomerFeedback.priority == priority)
    
    if rating_min:
        query = query.filter(CustomerFeedback.rating >= rating_min)
    
    if rating_max:
        query = query.filter(CustomerFeedback.rating <= rating_max)
    
    if date_from:
        query = query.filter(CustomerFeedback.created_at >= date_from)
    
    if date_to:
        query = query.filter(CustomerFeedback.created_at <= date_to)
    
    # Execute query with pagination
    results = query.offset(skip).limit(limit).all()
    return results

@router.get("/analytics", response_model=dict)
async def get_feedback_analytics(
    period: str = Query("month", regex="^(day|week|month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get comprehensive feedback analytics."""
    
    # Calculate date range
    end_date = datetime.now()
    if period == "day":
        start_date = end_date - timedelta(days=1)
    elif period == "week":
        start_date = end_date - timedelta(weeks=1)
    elif period == "month":
        start_date = end_date - timedelta(days=30)
    elif period == "quarter":
        start_date = end_date - timedelta(days=90)
    else:  # year
        start_date = end_date - timedelta(days=365)
    
    # Query feedback data
    feedback_data = db.query(CustomerFeedback).filter(
        CustomerFeedback.created_at.between(start_date, end_date)
    ).all()
    
    # Calculate analytics
    analytics = {
        "summary": {
            "total_feedback": len(feedback_data),
            "average_rating": sum(f.rating for f in feedback_data) / len(feedback_data) if feedback_data else 0,
            "response_rate": calculate_response_rate(period),
            "satisfaction_score": calculate_satisfaction_score(feedback_data)
        },
        "ratings_distribution": {},
        "support_type_breakdown": {},
        "priority_breakdown": {},
        "sentiment_analysis": {
            "positive": 0,
            "neutral": 0,
            "negative": 0
        },
        "trends": calculate_trends(feedback_data, period),
        "top_issues": extract_top_issues(feedback_data),
        "recommendations": generate_recommendations(feedback_data)
    }
    
    # Calculate distributions
    for rating in range(1, 11):
        analytics["ratings_distribution"][str(rating)] = len([f for f in feedback_data if f.rating == rating])
    
    for support_type in ["technical", "billing", "general"]:
        analytics["support_type_breakdown"][support_type] = len([f for f in feedback_data if f.support_type == support_type])
    
    for priority in ["low", "medium", "high", "urgent"]:
        analytics["priority_breakdown"][priority] = len([f for f in feedback_data if f.priority == priority])
    
    # Sentiment analysis aggregation
    for feedback in feedback_data:
        if feedback.sentiment_analysis:
            sentiment = feedback.sentiment_analysis.get("sentiment", "neutral")
            analytics["sentiment_analysis"][sentiment] += 1
    
    return analytics

@router.post("/execute-code", response_model=dict)
async def execute_custom_code(
    code_request: CodeExecutionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Execute custom Python code with feedback data context."""
    
    # Security validation
    if not validate_code_security(code_request.code):
        raise HTTPException(status_code=400, detail="Code contains unsafe operations")
    
    # Prepare execution context
    context = {
        "feedback_data": get_feedback_data_for_context(db, code_request.filters),
        "user_id": current_user.id,
        "execution_time": datetime.now()
    }
    
    # Execute code in sandboxed environment
    try:
        result = await execute_sandboxed_python(
            code_request.code,
            context,
            timeout=30,
            allowed_imports=["pandas", "numpy", "datetime", "json", "math"]
        )
        
        return {
            "success": True,
            "result": result,
            "execution_time": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "execution_time": datetime.now().isoformat()
        }
```

#### Generated MCP Tools
```python
# Auto-generated MCP tools for AI agents
from mcp import tool
from typing import Dict, List, Optional, Any
import json

@tool
async def customer_feedback_create(
    customer_name: str,
    email: str,
    rating: int,
    feedback: str,
    support_type: str = "general",
    priority: str = "medium"
) -> Dict[str, Any]:
    """
    Create a new customer feedback entry with automatic processing.
    
    This tool allows AI agents to submit customer feedback and receive
    immediate sentiment analysis and priority assessment.
    
    Args:
        customer_name: Full name of the customer
        email: Customer's email address
        rating: Rating from 1-10 (10 being highest satisfaction)
        feedback: Detailed feedback text
        support_type: Type of support needed (technical, billing, general)
        priority: Priority level (low, medium, high, urgent)
    
    Returns:
        Dictionary with feedback ID, sentiment analysis, and processing results
    """
    
    # Validate inputs
    validation_result = validate_feedback_inputs(
        customer_name, email, rating, feedback, support_type, priority
    )
    if not validation_result["valid"]:
        return {"success": False, "errors": validation_result["errors"]}
    
    try:
        # Execute sentiment analysis
        sentiment_analysis = await analyze_feedback_sentiment(feedback, rating)
        
        # Determine auto-priority based on content
        auto_priority = determine_priority_from_content(feedback, rating, sentiment_analysis)
        final_priority = auto_priority if auto_priority in ["high", "urgent"] else priority
        
        # Create feedback record
        feedback_data = {
            "customer_name": customer_name.strip(),
            "email": email.lower(),
            "rating": rating,
            "feedback": feedback.strip(),
            "support_type": support_type,
            "priority": final_priority,
            "sentiment_analysis": sentiment_analysis,
            "auto_prioritized": auto_priority != priority
        }
        
        # Submit to API
        api_response = await submit_to_feedback_api(feedback_data)
        
        # Generate response recommendations
        recommendations = generate_response_recommendations(sentiment_analysis, support_type, rating)
        
        return {
            "success": True,
            "feedback_id": api_response["id"],
            "sentiment": sentiment_analysis["sentiment"],
            "confidence": sentiment_analysis["confidence"],
            "priority_assigned": final_priority,
            "estimated_response_time": estimate_response_time(final_priority, support_type),
            "recommendations": recommendations,
            "next_actions": determine_next_actions(sentiment_analysis, priority, support_type)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create feedback: {str(e)}"
        }

@tool
async def customer_feedback_analytics(
    period: str = "month",
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Get comprehensive analytics about customer feedback patterns.
    
    Args:
        period: Time period for analysis (day, week, month, quarter, year)
        filters: Optional filters for data (support_type, priority, etc.)
    
    Returns:
        Comprehensive analytics including trends, patterns, and insights
    """
    
    try:
        # Fetch analytics from API
        analytics_data = await fetch_feedback_analytics(period, filters)
        
        # Generate AI insights
        insights = await generate_ai_insights(analytics_data)
        
        # Calculate trends and predictions
        trends = calculate_feedback_trends(analytics_data)
        predictions = predict_future_feedback_volume(trends)
        
        return {
            "success": True,
            "period": period,
            "summary": analytics_data["summary"],
            "distributions": analytics_data["distributions"],
            "trends": trends,
            "predictions": predictions,
            "insights": insights,
            "recommendations": generate_improvement_recommendations(analytics_data),
            "alerts": identify_concerning_patterns(analytics_data)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to get analytics: {str(e)}"
        }

@tool
async def customer_feedback_search(
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search through customer feedback using natural language queries.
    
    Args:
        query: Natural language search query
        filters: Additional filters to apply
        limit: Maximum number of results to return
    
    Returns:
        Relevant feedback entries with relevance scores
    """
    
    try:
        # Convert natural language query to search parameters
        search_params = parse_natural_language_query(query)
        
        # Combine with additional filters
        if filters:
            search_params.update(filters)
        
        # Execute search
        search_results = await execute_feedback_search(search_params, limit)
        
        # Rank results by relevance
        ranked_results = rank_search_results(search_results, query)
        
        # Generate search insights
        search_insights = analyze_search_patterns(query, ranked_results)
        
        return {
            "success": True,
            "query": query,
            "total_results": len(search_results),
            "results": ranked_results[:limit],
            "insights": search_insights,
            "suggested_filters": suggest_additional_filters(search_results),
            "related_queries": generate_related_queries(query)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Search failed: {str(e)}"
        }
```

## 🔧 Customization Options

### API Behavior Customization
```python
# Customize generated API behavior
class APICustomization:
    def __init__(self, app_slug: str):
        self.app_slug = app_slug
        
    def add_custom_endpoint(self, path: str, method: str, handler: callable):
        """Add custom endpoint to generated API."""
        
    def modify_validation_rules(self, field_name: str, custom_validator: callable):
        """Add custom validation logic to specific fields."""
        
    def add_webhook_triggers(self, events: List[str], webhook_url: str):
        """Configure webhook notifications for specific events."""
        
    def customize_response_format(self, formatter: callable):
        """Customize API response format."""
        
    def add_rate_limiting(self, rules: Dict[str, int]):
        """Configure custom rate limiting rules."""

# Example customization
customization = APICustomization("customer-feedback")

# Add custom endpoint for bulk operations
@customization.add_custom_endpoint("/bulk-import", "POST")
async def bulk_import_feedback(file: UploadFile, db: Session = Depends(get_db)):
    """Custom endpoint for bulk feedback import."""
    # Custom logic here
    pass

# Add custom validation
@customization.modify_validation_rules("feedback")
def validate_feedback_content(feedback_text: str) -> bool:
    """Custom validation for feedback content."""
    # Check for spam, inappropriate content, etc.
    return is_appropriate_content(feedback_text)

# Configure webhooks
customization.add_webhook_triggers(
    events=["feedback_created", "high_priority_feedback"],
    webhook_url="https://your-system.com/webhooks/feedback"
)
```

### MCP Tool Customization
```python
# Customize MCP tool behavior
class MCPCustomization:
    def add_custom_tool(self, tool_name: str, tool_function: callable):
        """Add custom MCP tool for specific app needs."""
        
    def modify_tool_permissions(self, tool_name: str, permissions: Dict):
        """Customize tool access permissions."""
        
    def add_tool_context(self, context_provider: callable):
        """Add custom context to all tools."""

# Example custom MCP tool
@tool
async def customer_feedback_escalation_assistant(
    feedback_id: int,
    escalation_reason: str
) -> Dict[str, Any]:
    """
    Custom tool to handle feedback escalation with AI assistance.
    
    This tool analyzes feedback and provides escalation recommendations,
    suggests response templates, and identifies similar past issues.
    """
    
    # Get feedback details
    feedback = await get_feedback_by_id(feedback_id)
    
    # Analyze escalation need
    escalation_analysis = await analyze_escalation_requirements(feedback, escalation_reason)
    
    # Find similar past issues
    similar_issues = await find_similar_feedback(feedback["feedback"], feedback["support_type"])
    
    # Generate response recommendations
    response_suggestions = await generate_escalation_response(feedback, escalation_analysis)
    
    return {
        "escalation_priority": escalation_analysis["priority"],
        "recommended_department": escalation_analysis["department"],
        "response_templates": response_suggestions,
        "similar_past_issues": similar_issues,
        "estimated_resolution_time": escalation_analysis["estimated_time"],
        "required_approvals": escalation_analysis["approvals_needed"]
    }
```

## 📊 Advanced Features

### Real-time Data Synchronization
```python
# WebSocket integration for real-time updates
class RealTimeSync:
    def __init__(self, app_slug: str):
        self.app_slug = app_slug
        
    async def broadcast_update(self, event_type: str, data: dict):
        """Broadcast updates to connected clients."""
        await websocket_manager.broadcast(f"{self.app_slug}:{event_type}", data)
        
    async def notify_ai_agents(self, event_type: str, data: dict):
        """Notify AI agents about data changes via MCP."""
        await mcp_notifier.send_notification(event_type, data)

# Auto-generated WebSocket handlers
@websocket_router.websocket("/ws/custom/{app_slug}")
async def websocket_endpoint(websocket: WebSocket, app_slug: str):
    await websocket_manager.connect(websocket, app_slug)
    
    try:
        while True:
            # Listen for client updates
            data = await websocket.receive_json()
            
            # Process real-time updates
            await process_realtime_update(app_slug, data)
            
            # Broadcast to other connected clients
            await websocket_manager.broadcast_to_group(app_slug, data)
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, app_slug)
```

### Data Export/Import Capabilities
```python
# Auto-generated export/import functionality
@router.get("/export")
async def export_data(
    format: str = Query("csv", regex="^(csv|json|excel|pdf)$"),
    filters: Optional[dict] = None,
    db: Session = Depends(get_db)
):
    """Export app data in various formats."""
    
    # Apply filters and get data
    data = get_filtered_data(db, filters)
    
    if format == "csv":
        return generate_csv_export(data)
    elif format == "json":
        return generate_json_export(data)
    elif format == "excel":
        return generate_excel_export(data)
    elif format == "pdf":
        return generate_pdf_report(data)

@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    mapping: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Import data from various file formats."""
    
    # Validate file format
    if not validate_import_file(file):
        raise HTTPException(status_code=400, detail="Invalid file format")
    
    # Parse file content
    parsed_data = parse_import_file(file, mapping)
    
    # Validate data against schema
    validation_results = validate_import_data(parsed_data)
    
    if validation_results["errors"]:
        return {
            "success": False,
            "errors": validation_results["errors"],
            "valid_records": validation_results["valid_count"],
            "invalid_records": validation_results["invalid_count"]
        }
    
    # Import valid records
    import_results = bulk_import_records(db, parsed_data)
    
    return {
        "success": True,
        "imported_records": import_results["success_count"],
        "failed_records": import_results["failed_count"],
        "import_summary": import_results["summary"]
    }
```

## 🔒 Security Features

### Auto-Generated Security Measures
```python
# Security features built into every generated API
class GeneratedAPISecurity:
    def __init__(self, app_slug: str):
        self.app_slug = app_slug
        
    async def validate_api_key(self, api_key: str) -> bool:
        """Validate API key for external access."""
        
    async def check_rate_limits(self, user_id: int, endpoint: str) -> bool:
        """Check if user has exceeded rate limits."""
        
    async def log_api_access(self, user_id: int, endpoint: str, ip: str):
        """Log all API access for audit purposes."""
        
    async def sanitize_input(self, data: dict) -> dict:
        """Sanitize all input data to prevent injection attacks."""
        
    async def encrypt_sensitive_data(self, data: dict) -> dict:
        """Encrypt sensitive fields before storage."""

# Input validation middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Rate limiting
    if not await check_rate_limits(request):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Input sanitization
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
        sanitized_body = sanitize_request_body(body)
        request._body = sanitized_body
    
    # Security headers
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response
```

## 📈 Performance Optimization

### Automatic Performance Features
```python
# Performance optimizations built into generated APIs
class PerformanceOptimizations:
    def __init__(self, app_slug: str):
        self.app_slug = app_slug
        
    async def setup_caching(self):
        """Configure Redis caching for frequent queries."""
        
    async def optimize_database_queries(self):
        """Add indexes and query optimizations."""
        
    async def implement_pagination(self):
        """Add efficient pagination to list endpoints."""
        
    async def add_compression(self):
        """Enable response compression for large datasets."""

# Example optimized endpoint
@router.get("/", response_model=List[RecordResponse])
@cache(expire=300)  # Cache for 5 minutes
async def list_records_optimized(
    skip: int = Query(0),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    """Optimized list endpoint with caching and efficient queries."""
    
    # Use optimized query with proper indexes
    query = db.query(Record).options(
        selectinload(Record.related_data),  # Eager load related data
        defer(Record.large_text_field)      # Defer large fields
    )
    
    # Apply pagination efficiently
    total = query.count()
    records = query.offset(skip).limit(limit).all()
    
    return {
        "records": records,
        "total": total,
        "page": skip // limit + 1,
        "pages": math.ceil(total / limit)
    }
```

## 📚 Best Practices

### 1. API Design Principles
- **Consistent naming conventions** across all endpoints
- **Proper HTTP status codes** for different scenarios
- **Comprehensive error handling** with meaningful messages
- **Request/response validation** using Pydantic models
- **API versioning** for backward compatibility
- **Rate limiting** to prevent abuse
- **Caching** for performance optimization

### 2. Security Best Practices
- **Input validation** on all endpoints
- **Authentication** required for protected operations
- **Authorization** checks for data access
- **SQL injection prevention** through ORM usage
- **XSS protection** in response data
- **CSRF protection** for state-changing operations
- **Audit logging** for compliance

### 3. Performance Guidelines
- **Database query optimization** with proper indexes
- **Pagination** for large datasets
- **Caching** frequently accessed data
- **Compression** for large responses
- **Async operations** for I/O bound tasks
- **Connection pooling** for database efficiency
- **Background tasks** for heavy operations

### 4. Documentation Standards
- **OpenAPI/Swagger** documentation
- **Example requests/responses** for all endpoints
- **Error code documentation** with explanations
- **Authentication guide** for API usage
- **SDK/client library** examples
- **Testing instructions** and examples
- **Changelog** for API updates

---

## 🎯 API Development Success

### Key Success Metrics
1. **Response Time**: < 500ms for 95% of requests
2. **Uptime**: 99.9% availability
3. **Error Rate**: < 1% of requests
4. **Documentation Coverage**: 100% of endpoints
5. **Security Score**: Pass all security scans
6. **Developer Experience**: High satisfaction ratings

### Continuous Improvement
- **Monitor API performance** regularly
- **Collect developer feedback** for improvements
- **Update security measures** as needed
- **Optimize based on usage patterns**
- **Maintain backward compatibility**
- **Provide excellent developer support**

**Build powerful, secure, and scalable APIs with Custom Field Builder Pro! 🚀** 