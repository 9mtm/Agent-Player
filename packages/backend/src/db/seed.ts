/**
 * Database Seeding Script
 * Creates initial data for development
 */

import { getDatabase, getRepositories } from './index.js';

export async function seedDatabase() {
  console.log('[Seed] Starting database seeding...');

  const repos = getRepositories();

  try {
    // Check if owner already exists
    const existingOwner = repos.users.findByEmail('owner@localhost');

    if (!existingOwner) {
      // Create owner user
      const owner = await repos.users.create({
        email: 'owner@localhost',
        username: 'owner',
        password: 'admin123', // Default password for development
        full_name: 'System Owner',
        role: 'owner'
      });

      console.log('[Seed] ✅ Created owner user:');
      console.log(`       Email: ${owner.email}`);
      console.log(`       Password: admin123`);
      console.log(`       Role: ${owner.role}`);
    } else {
      console.log('[Seed] Owner user already exists, skipping...');
    }

    // Check if admin exists
    const existingAdmin = repos.users.findByEmail('admin@localhost');

    if (!existingAdmin) {
      // Create admin user
      const admin = await repos.users.create({
        email: 'admin@localhost',
        username: 'admin',
        password: 'admin123',
        full_name: 'System Admin',
        role: 'admin'
      });

      console.log('[Seed] ✅ Created admin user:');
      console.log(`       Email: ${admin.email}`);
      console.log(`       Password: admin123`);
      console.log(`       Role: ${admin.role}`);
    } else {
      console.log('[Seed] Admin user already exists, skipping...');
    }

    // Check if regular user exists
    const existingUser = repos.users.findByEmail('user@localhost');

    if (!existingUser) {
      // Create regular user
      const user = await repos.users.create({
        email: 'user@localhost',
        username: 'user',
        password: 'user123',
        full_name: 'Test User',
        role: 'user'
      });

      console.log('[Seed] ✅ Created regular user:');
      console.log(`       Email: ${user.email}`);
      console.log(`       Password: user123`);
      console.log(`       Role: ${user.role}`);
    } else {
      console.log('[Seed] Regular user already exists, skipping...');
    }

    // Create mock session for backward compatibility
    const ownerUser = repos.users.findByEmail('owner@localhost');
    if (ownerUser) {
      const sessions = repos.sessions.findUserSessions(ownerUser.id);
      if (sessions.length === 0) {
        const session = repos.sessions.createSession({
          user_id: ownerUser.id,
          title: 'Welcome Chat',
          model: 'claude-sonnet-4-5-20250929',
          system_prompt: 'You are a helpful AI assistant.'
        });

        repos.sessions.createMessage({
          session_id: session.id,
          role: 'assistant',
          content: 'Welcome to Agent Player! How can I help you today?'
        });

        console.log('[Seed] ✅ Created welcome chat session');
      }
    }

    console.log('[Seed] ✅ Database seeding completed!\n');
  } catch (error) {
    console.error('[Seed] ❌ Error seeding database:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { initializeDatabase } = await import('./index.js');
  await initializeDatabase();
  await seedDatabase();
  process.exit(0);
}
