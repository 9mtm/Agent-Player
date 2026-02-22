import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// Demo users (in production, use backend API for auth)
const DEMO_USERS = [
    {
        id: 'demo-user-1',
        email: 'admin@example.com',
        password: '$2a$10$rPQ.ZxQYx9L7gL0QRjZ5xO5qQQ5W5x5x5x5x5x5x5x5x5x5x5x', // "admin123"
        name: 'Admin User',
        role: 'admin',
    },
    {
        id: 'demo-user-2',
        email: 'demo@example.com',
        password: '$2a$10$rPQ.ZxQYx9L7gL0QRjZ5xO5qQQ5W5x5x5x5x5x5x5x5x5x5x5x', // "demo123"
        name: 'Demo User',
        role: 'user',
    },
];

/**
 * POST /api/auth/login
 * Simple login for demo mode
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        console.log('Login attempt:', { email });

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Check environment-based auth first
        const envEmail = process.env.ADMIN_EMAIL || 'admin@agentplayer.local';
        const envPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (email === envEmail && password === envPassword) {
            const cookieStore = await cookies();
            cookieStore.set('session', JSON.stringify({
                userId: 'env-admin',
                email: envEmail,
                role: 'admin',
                name: 'Admin',
            }), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
            });

            return NextResponse.json({
                success: true,
                user: {
                    id: 'env-admin',
                    email: envEmail,
                    name: 'Admin',
                    role: 'admin',
                },
            });
        }

        // Check demo users
        const user = DEMO_USERS.find(u => u.email === email);

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // For demo, accept any password or check hashed
        const isPasswordValid = await bcrypt.compare(password, user.password).catch(() => false);

        // Also accept plain password match for easy demo
        const isPlainMatch = password === 'admin123' || password === 'demo123' || password === 'admin';

        if (!isPasswordValid && !isPlainMatch) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Set session cookie
        const cookieStore = await cookies();
        cookieStore.set('session', JSON.stringify({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        console.log('Login successful');

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') },
            { status: 500 }
        );
    }
}
