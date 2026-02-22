import { cookies } from 'next/headers';

export interface SessionUser {
    userId: string;
    email: string;
    role: string;
    name?: string;
}

// Auto-login in development mode — avoids requiring manual login on every restart
const DEV_AUTO_LOGIN = process.env.NODE_ENV !== 'production';

const DEV_USER: SessionUser = {
    userId: 'dev-user-1',
    email: process.env.ADMIN_EMAIL || 'admin@agentplayer.local',
    role: 'admin',
    name: 'Dev Admin',
};

/**
 * Get current user from session cookie.
 * In development mode, returns a default admin user when no session exists.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return DEV_AUTO_LOGIN ? DEV_USER : null;
        }

        const session = JSON.parse(sessionCookie.value) as SessionUser;
        return session;
    } catch (error) {
        console.error('Error reading session:', error);
        return DEV_AUTO_LOGIN ? DEV_USER : null;
    }
}

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
    const user = await getSessionUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}
