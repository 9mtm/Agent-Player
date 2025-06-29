from typing import Optional, Dict, Any

GEMINI_AVAILABLE = False
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    print("Warning: google-generativeai not installed. Gemini features will be disabled.")

class GeminiService:
    def __init__(self):
        self.model = None
        self.is_available = GEMINI_AVAILABLE

    async def initialize_with_api_key(self, api_key: str):
        """Initialize Gemini with API key"""
        if not self.is_available:
            return {
                "success": False,
                "error": "Gemini is not available. Please install google-generativeai package."
            }
            
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            return {"success": True}
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def generate_content(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using Gemini"""
        if not self.is_available:
            return {
                "success": False,
                "error": "Gemini is not available. Please install google-generativeai package."
            }
            
        if not self.model:
            return {
                "success": False,
                "error": "Gemini not initialized. Please initialize with API key first."
            }

        try:
            if not self.is_available:
                # Return mock response for testing
                return {
                    "success": True,
                    "content": f"Mock response for: {prompt}",
                    "usage": {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0
                    }
                }
                
            response = await self.model.generate_content(prompt, **kwargs)
            
            return {
                "success": True,
                "content": response.text,
                "usage": {
                    "prompt_tokens": 0,  # API doesn't provide token counts yet
                    "completion_tokens": 0,
                    "total_tokens": 0
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Create singleton instance
gemini_service = GeminiService() 