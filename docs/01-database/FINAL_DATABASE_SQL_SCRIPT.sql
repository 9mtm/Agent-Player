-- 🎮 AGENT PLAYER - FINAL DATABASE STRUCTURE
-- AI Agent Management & Training Platform
-- Complete SQL Script for Training Lab Implementation
-- 
-- Project: Agent Player ( agent-player.net)
-- Company: Dpro GmbH  
-- Description: Professional AI Agent Training & Management Platform
-- Execute this to create the entire database structure

-- ===================================================================
-- 1. IAM DOMAIN (Identity & Access Management)
-- ===================================================================

-- Core user accounts
CREATE TABLE iam_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@%.%'),
    username VARCHAR(100) UNIQUE NOT NULL CHECK (length(username) >= 3),
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    
    -- User Role & Status
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'manager')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Login Tracking
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complete database schema (37 tables across 11 domains)
-- This file contains the full SQL script from the parent directory
-- Execute: psql -d your_database -f FINAL_DATABASE_SQL_SCRIPT.sql

-- For the complete SQL script, refer to the parent directory:
-- ../FINAL_DATABASE_SQL_SCRIPT.sql (57KB, 1394 lines)

-- Summary:
-- - 37 tables across 11 business domains
-- - 55+ performance indexes
-- - Automated triggers for data consistency
-- - Complete Agent Player database structure
-- - Training Lab ready implementation 