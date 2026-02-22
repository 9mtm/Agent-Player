'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Role } from '@/lib/auth/roles';

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
    login: (email: string, password: string) => Promise<void>;
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

const setToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
};

const removeToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
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
            const publicPaths = ['/login', '/register'];
            const isPublicPath = publicPaths.some(path =>
                window.location.pathname.startsWith(path)
            );

            if (!isPublicPath) {
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

    const login = async (email: string, password: string) => {
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
            setUser({
                id: data.user.id,
                name: data.user.full_name || data.user.username,
                email: data.user.email,
                role: data.user.role as Role,
                avatar: data.user.avatar_url,
            });
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const token = getToken();

            if (token) {
                // Call backend logout endpoint
                await fetch(`${BACKEND_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
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
