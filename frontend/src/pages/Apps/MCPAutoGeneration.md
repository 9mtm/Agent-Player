# 🔥 MCP Auto-Generation System - Revolutionary AI Integration

## 🎯 Overview
Automatically generate MCP (Model Context Protocol) tools alongside REST APIs for every custom page/form created by users. This allows AI agents to seamlessly interact with custom data and functionality.

## 🚀 What Gets Auto-Generated

For every Custom Field Builder page, the system automatically creates:

### 1. ✅ REST APIs (Standard HTTP)
- GET, POST, PUT, DELETE endpoints
- Standard JSON responses
- Authentication & validation

### 2. 🆕 MCP Tools (AI Agent Integration) 
- AI-readable tool definitions
- Automatic parameter validation
- Natural language descriptions
- AI agent function calling

### 3. 🗄️ Database Integration
- Auto-generated tables
- Optimized queries
- Data relationships

### 4. 📱 Frontend Components
- Dynamic forms
- Real-time updates
- User-friendly interface

## 🧩 MCP Tool Generation Examples

### Example 1: Custom Agent Analytics Page

#### User Creates Page:
```json
{
  "page_name": "Agent Performance Analytics",
  "slug": "agent-analytics",
  "fields": [
    {
      "name": "agent_id",
      "type": "select",
      "label": "Select Agent",
      "data_source": "agents"
    },
    {
      "name": "analysis_code",
      "type": "code_editor",
      "language": "python",
      "label": "Analysis Script"
    },
    {
      "name": "time_range",
      "type": "date_range",
      "label": "Analysis Period"
    }
  ]
}
```

#### Auto-Generated MCP Tool:
```json
{
  "name": "analyze_agent_performance",
  "description": "Analyze agent performance using custom Python scripts and generate detailed reports with metrics and recommendations.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agent_id": {
        "type": "integer",
        "description": "The ID of the agent to analyze"
      },
      "analysis_code": {
        "type": "string",
        "description": "Python code for custom analysis logic"
      },
      "time_range": {
        "type": "object",
        "properties": {
          "start_date": {"type": "string", "format": "date"},
          "end_date": {"type": "string", "format": "date"}
        },
        "description": "Date range for the analysis period"
      }
    },
    "required": ["agent_id", "analysis_code"]
  }
}
```

#### Auto-Generated MCP Implementation:
```python
@mcp_tool
async def analyze_agent_performance(
    agent_id: int,
    analysis_code: str,
    time_range: Optional[DateRange] = None
) -> Dict[str, Any]:
    """
    Analyze agent performance using custom Python scripts.
    
    This tool allows AI agents to:
    - Execute custom analysis code on agent data
    - Generate performance metrics and insights
    - Provide actionable recommendations
    
    Args:
        agent_id: The ID of the agent to analyze
        analysis_code: Python code for custom analysis
        time_range: Optional date range for analysis
    
    Returns:
        Analysis results with metrics and recommendations
    """
    try:
        # Get agent data
        agent_data = await get_agent_data(agent_id, time_range)
        
        # Execute user's custom Python code safely
        analysis_result = await execute_safe_python_code(
            code=analysis_code,
            context={'agent_data': agent_data}
        )
        
        # Store results in database
        record = await save_analysis_result(
            agent_id=agent_id,
            analysis_code=analysis_code,
            results=analysis_result
        )
        
        return {
            "success": True,
            "analysis_id": record.id,
            "results": analysis_result,
            "agent_info": {
                "id": agent_id,
                "name": agent_data.get('name'),
                "status": agent_data.get('status')
            },
            "recommendations": analysis_result.get('recommendations', [])
        }
        
    except Exception as e:
        logger.error(f"Agent analysis failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }
```

### Example 2: Custom Data Processor Page

#### User Creates Page:
```json
{
  "page_name": "External Data Processor",
  "slug": "data-processor",
  "fields": [
    {
      "name": "api_endpoint",
      "type": "url",
      "label": "External API URL"
    },
    {
      "name": "processing_script",
      "type": "code_editor",
      "language": "python",
      "label": "Data Processing Logic"
    },
    {
      "name": "schedule",
      "type": "select",
      "label": "Processing Schedule",
      "options": ["manual", "hourly", "daily", "weekly"]
    }
  ]
}
```

#### Auto-Generated MCP Tool:
```json
{
  "name": "process_external_data",
  "description": "Fetch data from external APIs and process it using custom Python scripts. Supports scheduled processing and real-time data transformation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "api_endpoint": {
        "type": "string",
        "format": "uri",
        "description": "The external API endpoint to fetch data from"
      },
      "processing_script": {
        "type": "string",
        "description": "Python code to process the fetched data"
      },
      "schedule": {
        "type": "string",
        "enum": ["manual", "hourly", "daily", "weekly"],
        "description": "Processing schedule frequency"
      }
    },
    "required": ["api_endpoint", "processing_script"]
  }
}
```

#### Auto-Generated MCP Implementation:
```python
@mcp_tool
async def process_external_data(
    api_endpoint: str,
    processing_script: str,
    schedule: str = "manual"
) -> Dict[str, Any]:
    """
    Fetch and process external data using custom logic.
    
    This tool enables AI agents to:
    - Connect to external APIs
    - Process data with custom Python scripts
    - Schedule automatic data processing
    - Transform and store processed data
    
    Args:
        api_endpoint: External API URL to fetch data from
        processing_script: Custom Python processing logic
        schedule: Processing frequency (manual, hourly, daily, weekly)
    
    Returns:
        Processing results and status information
    """
    try:
        # Fetch data from external API
        external_data = await fetch_external_data(api_endpoint)
        
        # Execute custom processing script
        processed_data = await execute_safe_python_code(
            code=processing_script,
            context={
                'raw_data': external_data,
                'requests': requests,
                'json': json,
                'datetime': datetime
            }
        )
        
        # Save processed data
        record = await save_processed_data(
            api_endpoint=api_endpoint,
            raw_data=external_data,
            processed_data=processed_data,
            processing_script=processing_script
        )
        
        # Setup schedule if requested
        if schedule != "manual":
            await setup_processing_schedule(record.id, schedule)
        
        return {
            "success": True,
            "processor_id": record.id,
            "records_processed": len(processed_data) if isinstance(processed_data, list) else 1,
            "schedule_status": f"Scheduled for {schedule}" if schedule != "manual" else "Manual processing",
            "processed_data_preview": processed_data[:5] if isinstance(processed_data, list) else processed_data
        }
        
    except Exception as e:
        logger.error(f"Data processing failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }
```

### Example 3: Custom Report Generator

#### User Creates Page:
```json
{
  "page_name": "Custom Report Generator",
  "slug": "report-generator",
  "fields": [
    {
      "name": "report_type",
      "type": "select",
      "label": "Report Type",
      "options": ["agent_performance", "user_activity", "system_health", "custom"]
    },
    {
      "name": "data_sources",
      "type": "multi_select",
      "label": "Data Sources",
      "options": ["agents", "users", "tasks", "conversations", "analytics"]
    },
    {
      "name": "report_script",
      "type": "code_editor",
      "language": "python",
      "label": "Report Generation Logic"
    },
    {
      "name": "output_format",
      "type": "radio",
      "label": "Output Format",
      "options": ["json", "pdf", "excel", "csv"]
    }
  ]
}
```

#### Auto-Generated MCP Tool:
```python
@mcp_tool
async def generate_custom_report(
    report_type: str,
    data_sources: List[str],
    report_script: str,
    output_format: str = "json"
) -> Dict[str, Any]:
    """
    Generate custom reports with user-defined logic and multiple output formats.
    
    This tool allows AI agents to:
    - Create reports from multiple data sources
    - Apply custom analysis and formatting
    - Export reports in various formats
    - Schedule automatic report generation
    
    Args:
        report_type: Type of report to generate
        data_sources: List of data sources to include
        report_script: Custom Python script for report logic
        output_format: Desired output format (json, pdf, excel, csv)
    
    Returns:
        Generated report data and download links
    """
    try:
        # Fetch data from selected sources
        source_data = {}
        for source in data_sources:
            source_data[source] = await fetch_data_source(source)
        
        # Execute custom report script
        report_data = await execute_safe_python_code(
            code=report_script,
            context={
                'data': source_data,
                'pandas': pd,
                'numpy': np,
                'datetime': datetime
            }
        )
        
        # Generate output in requested format
        output_file = await generate_report_output(
            data=report_data,
            format=output_format,
            report_type=report_type
        )
        
        # Save report record
        record = await save_report_record(
            report_type=report_type,
            data_sources=data_sources,
            report_script=report_script,
            output_format=output_format,
            output_file=output_file
        )
        
        return {
            "success": True,
            "report_id": record.id,
            "report_type": report_type,
            "data_sources": data_sources,
            "output_format": output_format,
            "download_url": f"/api/reports/download/{record.id}",
            "file_size": output_file.size,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }
```

## 🔧 MCP Tool Registration System

### Auto-Registration Process:
```python
class MCPToolAutoGenerator:
    def __init__(self):
        self.mcp_server = MCPServer("dpro-custom-tools")
        
    async def generate_mcp_tool(self, page_config: dict):
        """
        Auto-generate MCP tool from Custom Field Builder page configuration
        """
        # Generate tool metadata
        tool_name = f"{page_config['slug'].replace('-', '_')}"
        tool_description = self.generate_description(page_config)
        input_schema = self.generate_input_schema(page_config['fields'])
        
        # Generate tool implementation
        tool_function = self.generate_tool_function(page_config)
        
        # Register with MCP server
        self.mcp_server.register_tool(
            name=tool_name,
            description=tool_description,
            input_schema=input_schema,
            handler=tool_function
        )
        
        # Generate REST API endpoint
        await self.generate_rest_endpoint(page_config)
        
        # Update tool registry
        await self.update_tool_registry(tool_name, page_config)
        
    def generate_input_schema(self, fields: List[dict]) -> dict:
        """Convert Custom Field Builder fields to JSON Schema"""
        schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for field in fields:
            prop = self.field_to_schema_property(field)
            schema["properties"][field["name"]] = prop
            
            if field.get("required", False):
                schema["required"].append(field["name"])
                
        return schema
    
    def field_to_schema_property(self, field: dict) -> dict:
        """Convert field definition to JSON Schema property"""
        field_type = field["type"]
        
        mappings = {
            "text": {"type": "string"},
            "number": {"type": "number"},
            "email": {"type": "string", "format": "email"},
            "url": {"type": "string", "format": "uri"},
            "date": {"type": "string", "format": "date"},
            "code_editor": {"type": "string"},
            "select": {"type": "string", "enum": field.get("options", [])},
            "multi_select": {"type": "array", "items": {"type": "string"}},
            "file": {"type": "string", "format": "uri"},
            "json": {"type": "object"}
        }
        
        return mappings.get(field_type, {"type": "string"})
```

## 🌟 Benefits of Auto-Generated MCP Tools

### For AI Agents:
- **Seamless Integration** - AI can use custom tools naturally
- **Natural Language Interface** - Describe what you want, AI does it
- **Custom Logic Execution** - Run user's Python code safely
- **Data Processing** - Complex data transformations
- **External API Integration** - Connect to any service

### For Users:
- **No MCP Knowledge Required** - Tools generated automatically
- **AI-Powered Interface** - Talk to AI to use your custom tools
- **Unlimited Flexibility** - Any custom logic becomes AI-accessible
- **Real-Time Results** - Immediate AI interaction with custom data

### For Developers:
- **Zero Manual Work** - Everything auto-generated
- **Consistent API** - Standard patterns for all tools
- **Type Safety** - Automatic validation and error handling
- **Scalable Architecture** - Handles unlimited custom tools

## 🚀 Usage Examples

### AI Agent Interaction:
```
User: "Analyze the performance of agent #42 using the custom analytics tool"

AI Agent: I'll use the analyze_agent_performance tool to analyze agent #42.

[Calls auto-generated MCP tool]

AI Agent: "Based on the analysis:
- Average response time: 1.2 seconds (good)
- Success rate: 94% (excellent) 
- Recommendations: Consider optimizing for peak hours
- Full analysis saved with ID: 156"
```

### Complex Data Processing:
```
User: "Fetch data from our external CRM API and process it to extract customer insights"

AI Agent: I'll use the process_external_data tool to fetch and analyze the CRM data.

[Executes user's custom Python script via MCP]

AI Agent: "Processed 1,247 customer records:
- Identified 89 high-value prospects
- Generated segmentation analysis
- Scheduled daily updates
- Results available in your dashboard"
```

## 🎯 Revolutionary Impact

This system creates **the first platform** where:
1. **Users build custom tools visually**
2. **AI agents use them automatically**  
3. **No programming knowledge required**
4. **Unlimited customization possible**
5. **Real-time AI interaction**

**هذا سيغير قواعد اللعبة تماماً!** 🔥

Users can create ANY custom functionality and AI agents will be able to use it immediately - this is **more powerful than any existing platform**! 🚀 