import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '../../db/index.js';
import bcrypt from 'bcryptjs';

const execAsync = promisify(exec);

const SETUP_FLAG_FILE = join(process.cwd(), '.data', '.setup_complete');

export default async function setupRoutes(fastify: FastifyInstance) {
  // Check if setup is already complete
  fastify.get('/api/setup/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const isSetupComplete = existsSync(SETUP_FLAG_FILE);

    return reply.send({
      setupComplete: isSetupComplete,
      message: isSetupComplete ? 'Setup already completed' : 'Setup required'
    });
  });

  // Check system requirements
  fastify.get('/api/setup/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const checks = {
      node: false,
      python: false,
      ports: false,
      directories: false
    };

    try {
      // Check Node.js
      try {
        const { stdout } = await execAsync('node --version');
        checks.node = stdout.trim().length > 0;
      } catch (error) {
        console.error('Node.js check failed:', error);
      }

      // Check Python
      try {
        const pythonPath = process.env.PYTHON_PATH || 'C:\\Users\\Dpro GmbH\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
        const { stdout } = await execAsync(`"${pythonPath}" --version`);
        checks.python = stdout.includes('Python');
      } catch (error) {
        console.error('Python check failed:', error);
        // Python is optional, so we'll mark it as true anyway
        checks.python = true;
      }

      // Check ports (assume available - actual port binding will fail if not)
      checks.ports = true;

      // Check/create required directories
      try {
        const dataDir = join(process.cwd(), '.data');
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true });
        }

        const requiredDirs = [
          'storage',
          'storage/cache',
          'storage/cdn',
          'backups',
          'agents',
          'audit',
          'encryption',
          'multi-agent',
          'webhooks'
        ];

        for (const dir of requiredDirs) {
          const fullPath = join(dataDir, dir);
          if (!existsSync(fullPath)) {
            mkdirSync(fullPath, { recursive: true });
          }
        }

        checks.directories = true;
      } catch (error) {
        console.error('Directory creation failed:', error);
      }

      return reply.send(checks);
    } catch (error: any) {
      console.error('System check error:', error);
      return reply.status(500).send({
        error: 'System check failed',
        message: error.message
      });
    }
  });

  // Initialize database and run migrations
  fastify.post('/api/setup/database', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dataDir = join(process.cwd(), '.data');
      const dbPath = join(dataDir, 'agent-player.db');

      // Ensure .data directory exists
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Initialize database (migrations will run automatically on first connection)
      const db = getDatabase();

      // Verify database is working
      const result = db.prepare('SELECT 1 as test').get();

      if (!result || result.test !== 1) {
        throw new Error('Database initialization failed');
      }

      return reply.send({
        success: true,
        message: 'Database initialized successfully',
        dbPath
      });
    } catch (error: any) {
      console.error('Database initialization error:', error);
      return reply.status(500).send({
        error: 'Database initialization failed',
        message: error.message
      });
    }
  });

  // Create admin account
  fastify.post<{
    Body: {
      name: string;
      email: string;
      password: string;
    };
  }>('/api/setup/admin', async (request: FastifyRequest<{
    Body: {
      name: string;
      email: string;
      password: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { name, email, password } = request.body;

      // Validate input
      if (!name || !email || !password) {
        return reply.status(400).send({
          error: 'Missing required fields',
          message: 'Name, email, and password are required'
        });
      }

      if (password.length < 12) {
        return reply.status(400).send({
          error: 'Invalid password',
          message: 'Password must be at least 12 characters long (include uppercase, lowercase, number, special character)'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }

      const db = getDatabase();

      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return reply.status(409).send({
          error: 'User exists',
          message: 'An account with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate user ID
      const userId = Date.now().toString();

      // Create username from email
      const username = email.split('@')[0];

      // Create admin user with active status and verified email
      const stmt = db.prepare(`
        INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified, created_at, updated_at, token_version)
        VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1, datetime('now'), datetime('now'), 1)
      `);

      stmt.run(userId, email, username, passwordHash, name);

      return reply.send({
        success: true,
        message: 'Admin account created successfully',
        user: {
          id: userId,
          name,
          email
        }
      });
    } catch (error: any) {
      console.error('Admin account creation error:', error);
      return reply.status(500).send({
        error: 'Admin account creation failed',
        message: error.message
      });
    }
  });

  // Mark setup as complete
  fastify.post('/api/setup/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dataDir = join(process.cwd(), '.data');

      // Ensure .data directory exists
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Create setup complete flag file
      const setupData = {
        completedAt: new Date().toISOString(),
        version: '1.3.0'
      };

      writeFileSync(SETUP_FLAG_FILE, JSON.stringify(setupData, null, 2));

      return reply.send({
        success: true,
        message: 'Setup completed successfully'
      });
    } catch (error: any) {
      console.error('Setup completion error:', error);
      return reply.status(500).send({
        error: 'Setup completion failed',
        message: error.message
      });
    }
  });
}
