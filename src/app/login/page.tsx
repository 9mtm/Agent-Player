'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { onboardingAPI } from '@/lib/backend';
import { needsOnboardingCheck, postLoginRedirect } from '@/lib/auth/post-login';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const signedIn = await login(email, password);
            // F-05: an owner who has not finished onboarding goes to the wizard.
            let onboardingCompleted: boolean | null = null;
            if (needsOnboardingCheck(signedIn.role)) {
                try {
                    onboardingCompleted = (await onboardingAPI.getState()).completed;
                } catch {
                    onboardingCompleted = null; // unknown: no wizard redirect
                }
            }
            router.push(postLoginRedirect(signedIn.role, onboardingCompleted));
            router.refresh();
        } catch (error: any) {
            setError(error.message || 'Invalid credentials');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <div className="w-full max-w-md p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Bot className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Agent Player</h1>
                    <p className="text-muted-foreground mt-2">Sign in to your account</p>
                </div>

                <div className="bg-card border-2 rounded-2xl p-8 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary focus:outline-none transition-colors"
                                placeholder="owner@localhost"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary focus:outline-none transition-colors"
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl text-base font-medium"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Agent Player v1.3.0 - Self-hosted AI Assistant
                </p>
            </div>
        </div>
    );
}
