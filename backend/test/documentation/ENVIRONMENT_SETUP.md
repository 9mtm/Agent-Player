# 🔧 Environment Setup Guide

This guide helps you configure the environment variables for the Dpro AI Agent backend.

## 📋 Quick Setup

1. **Create Environment File**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Create .env file
   touch .env
   ```

2. **Copy Configuration Template**
   Copy the configuration below into your `.env` file and update the values:

## 🔑 Environment Variables Template

```bash
# ============================================================================
# DPRO AI AGENT - ENVIRONMENT CONFIGURATION
# ============================================================================
# Copy these variables to your .env file and fill in your actual values
# DO NOT commit .env file to version control
# ============================================================================

# ============================================================================
# APPLICATION SETTINGS
# ============================================================================
APP_NAME="DPRO AI Agent"
VERSION="2.0.0"
DEBUG=true
HOST="0.0.0.0"
PORT=8000

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DATABASE_URL="sqlite:///./dpro_agent.db"
DATABASE_ECHO=false

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================
# IMPORTANT: Change this to a strong, unique secret key in production
SECRET_KEY="your-super-secret-key-change-this-in-production"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM="HS256"

# ============================================================================
# AI SERVICES API KEYS
# ============================================================================
# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-3.5-turbo"
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000

# Anthropic API Configuration  
# Get your API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-3-sonnet-20240229"

# ============================================================================
# CORS SETTINGS
# ============================================================================
# Frontend URL for CORS (adjust if needed)
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
CORS_ALLOW_CREDENTIALS=true

# ============================================================================
# FILE UPLOAD SETTINGS
# ============================================================================
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIRECTORY="./files"
ALLOWED_FILE_TYPES=".txt,.pdf,.doc,.docx,.md"

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
LOG_LEVEL="INFO"
LOG_DIRECTORY="./logs"

# ============================================================================
# RATE LIMITING
# ============================================================================
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60  # seconds

# ============================================================================
# CACHE SETTINGS
# ============================================================================
CACHE_TTL=300  # 5 minutes

# ============================================================================
# EMAIL CONFIGURATION (Optional)
# ============================================================================
# Uncomment and configure if you need email functionality
# SMTP_SERVER=""
# SMTP_PORT=587
# SMTP_USERNAME=""
# SMTP_PASSWORD=""
# EMAIL_FROM=""

# ============================================================================
# DEVELOPMENT SETTINGS
# ============================================================================
# Set to false in production
RELOAD_ON_CHANGE=true
SHOW_DOCS=true

# ============================================================================
# PRODUCTION SETTINGS
# ============================================================================
# Uncomment these for production deployment
# DEBUG=false
# RELOAD_ON_CHANGE=false
# LOG_LEVEL="WARNING"
# SECRET_KEY="your-production-secret-key-here"
```

## 🔐 API Keys Setup

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in to your account
3. Click "Create new secret key"
4. Copy the key and add it to your `.env` file:
   ```bash
   OPENAI_API_KEY="sk-your-openai-api-key-here"
   ```

### Anthropic API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file:
   ```bash
   ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key-here"
   ```

## 🚀 Development vs Production

### Development Configuration
```bash
DEBUG=true
LOG_LEVEL="INFO"
RELOAD_ON_CHANGE=true
SECRET_KEY="development-key-not-for-production"
```

### Production Configuration
```bash
DEBUG=false
LOG_LEVEL="WARNING"
RELOAD_ON_CHANGE=false
SECRET_KEY="your-strong-production-secret-key"
HOST="your-production-domain.com"
```

## 🛡️ Security Best Practices

1. **Never commit `.env` files to version control**
2. **Use strong, unique secret keys in production**
3. **Rotate API keys regularly**
4. **Use environment-specific configurations**
5. **Keep sensitive data encrypted at rest**

## 🔍 Troubleshooting

### Common Issues

**1. Missing API Keys**
```bash
Error: OpenAI API key not configured
Solution: Add OPENAI_API_KEY to your .env file
```

**2. Database Connection Issues**
```bash
Error: Could not connect to database
Solution: Ensure DATABASE_URL is correctly configured
```

**3. CORS Issues**
```bash
Error: CORS policy blocked request
Solution: Add your frontend URL to CORS_ORIGINS
```

### Environment Validation
Run this command to check your environment setup:
```bash
python -c "from config.settings import settings; print('✅ Environment loaded successfully')"
```

## 📝 Notes

- All environment variables are loaded through `config/settings.py`
- Default values are provided for most settings
- Some settings (like API keys) must be explicitly configured
- The application will start without API keys but AI features won't work

## 📞 Support

If you encounter issues with environment setup:
- Check the [troubleshooting section](#-troubleshooting)
- Review the [project documentation](../README.md)
- Open an issue on [GitHub](https://github.com/Dpro-at/Dpro-AI-Agent/issues) 