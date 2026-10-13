'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Role } from '@/lib/auth/roles';
import { isPublicPath } from '@/lib/auth/first-run';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    /** Resolves with the signed-in user (F-05: the login page routes by role). */
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage helpers
const TOKEN_KEY = 'auth_token';

const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

// The same token is mirrored into a SameSite=Strict cookie so same-origin
// Next.js API routes (/api/chat, /api/memory, ...) can verify it with the
// backend (S0-Q.9). The cookie carries only the backend-signed JWT.
const syncTokenCookie = (token: string | null): void => {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = token
        ? `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}${secure}`
        : `${TOKEN_KEY}=; Path=/; SameSite=Strict; Max-Age=0${secure}`;
};

const setToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    syncTokenCookie(token);
};

const removeToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    syncTokenCookie(null);
};

// Backend API URL
import { config } from '@/lib/config';
const BACKEND_URL = config.backendUrl;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from session on mount
    useEffect(() => {
        loadUser();
    }, []);

    // Redirect to login if not authenticated (except on public pages)
    useEffect(() => {
        if (!isLoading && !user && typeof window !== 'undefined') {
            // Public pages: /login, /setup (first run, F-01), /avatar-lab.
            // There is no open self-registration page.
            if (!isPublicPath(window.location.pathname)) {
                window.location.href = '/login';
            }
        }
    }, [user, isLoading]);

    const loadUser = async () => {
        try {
            const token = getToken();

            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Call real backend API with token
            const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                syncTokenCookie(token); // keep the cookie in step for existing sessions
                // Map backend user to frontend User interface
                setUser({
                    id: data.user.id,
                    name: data.user.full_name || data.user.username,
                    email: data.user.email,
                    role: data.user.role as Role,
                    avatar: data.user.avatar_url,
                });
            } else {
                // Token invalid or expired
                removeToken();
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            removeToken();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<User> => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();

            // Store JWT token
            setToken(data.token);

            // Set user from response
            const signedIn: User = {
                id: data.user.id,
                name: data.user.full_name || data.user.username,
                email: data.user.email,
                role: data.user.role as Role,
                avatar: data.user.avatar_url,
            };
            setUser(signedIn);
            return signedIn;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const token = getToken();

            if (token) {
                // F-02: the Next.js route ends the session on the backend
                // (token invalidated) and clears the auth cookie server-side.
                let backendLoggedOut = false;
                try {
                    const res = await fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (res.ok) {
                        const data = await res.json().catch(() => null);
                        backendLoggedOut = data?.backendLoggedOut === true;
                    }
                } catch { /* fall back to the direct call below */ }

                // If the Next.js server could not reach the backend, call it directly.
                if (!backendLoggedOut) {
                    await fetch(`${BACKEND_URL}/api/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear token and user regardless of API call success
            removeToken();
            setUser(null);
            window.location.href = '/login';
        }
    };

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
