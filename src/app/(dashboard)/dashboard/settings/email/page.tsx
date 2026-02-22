'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle, Send, Loader2, AlertCircle, Copy, Check, ChevronLeft } from 'lucide-react';
import { config } from '@/lib/config';
import { toast } from 'sonner';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

export default function EmailSettingsPage() {
    const router = useRouter();
    const [emailStatus, setEmailStatus] = useState<{
        configured: boolean;
        message: string;
    } | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [verifyResult, setVerifyResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [copiedEnv, setCopiedEnv] = useState(false);

    useEffect(() => {
        loadEmailStatus();
    }, []);

    const loadEmailStatus = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/status`, {
                headers: authHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setEmailStatus(data);
            }
        } catch (error) {
            console.error('Failed to load email status:', error);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const handleVerify = async () => {
        setIsVerifying(true);
        setVerifyResult(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/verify`, {
                method: 'POST',
                headers: authHeaders(),
            });

            const data = await response.json();
            setVerifyResult(data);
        } catch (error) {
            setVerifyResult({
                success: false,
                message: 'Failed to verify SMTP connection',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) {
            toast.error('Please enter an email address');
            return;
        }

        setIsSendingTest(true);
        setTestResult(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/test`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ to: testEmail }),
            });

            const data = await response.json();
            setTestResult(data);
            if (data.success) {
                setTestEmail('');
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Failed to send test email',
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    const copyEnvTemplate = () => {
        const template = `# Email / SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Agent Player
SMTP_FROM_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:41521`;

        navigator.clipboard.writeText(template);
        setCopiedEnv(true);
        setTimeout(() => setCopiedEnv(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/settings')}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to Settings
                </Button>
            </div>

            <div>
                <h2 className="text-3xl font-bold tracking-tight">Email Settings</h2>
                <p className="text-muted-foreground">
                    Configure SMTP for team invitations and notifications
                </p>
            </div>

            <div className="space-y-4">
                {/* Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Email Configuration Status</CardTitle>
                        <CardDescription>
                            Check if SMTP is configured and working
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingStatus ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading status...
                            </div>
                        ) : emailStatus ? (
                            <>
                                <div className="flex items-center gap-2">
                                    {emailStatus.configured ? (
                                        <>
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="font-medium">SMTP Configured</span>
                                            <Badge variant="outline" className="ml-auto">Active</Badge>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-5 w-5 text-orange-500" />
                                            <span className="font-medium">SMTP Not Configured</span>
                                            <Badge variant="secondary" className="ml-auto">Inactive</Badge>
                                        </>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {emailStatus.message}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Failed to load email status
                            </p>
                        )}

                        {emailStatus?.configured && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleVerify}
                                    disabled={isVerifying}
                                    variant="outline"
                                >
                                    {isVerifying ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                                    ) : (
                                        <><CheckCircle className="mr-2 h-4 w-4" /> Verify Connection</>
                                    )}
                                </Button>
                                <Button onClick={loadEmailStatus} variant="ghost">
                                    Refresh Status
                                </Button>
                            </div>
                        )}

                        {verifyResult && (
                            <div className={`flex items-start gap-2 p-3 rounded-md ${
                                verifyResult.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
                            }`}>
                                {verifyResult.success ? (
                                    <CheckCircle className="h-5 w-5 mt-0.5" />
                                ) : (
                                    <XCircle className="h-5 w-5 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {verifyResult.success ? 'Connection Verified' : 'Verification Failed'}
                                    </p>
                                    <p className="text-sm">{verifyResult.message}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Test Email Card */}
                {emailStatus?.configured && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Send Test Email</CardTitle>
                            <CardDescription>
                                Test your SMTP configuration by sending a test email
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="test-email">Recipient Email</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="test-email"
                                        type="email"
                                        placeholder="test@example.com"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                    />
                                    <Button
                                        onClick={handleSendTest}
                                        disabled={isSendingTest}
                                    >
                                        {isSendingTest ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                        ) : (
                                            <><Send className="mr-2 h-4 w-4" /> Send Test</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {testResult && (
                                <div className={`flex items-start gap-2 p-3 rounded-md ${
                                    testResult.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
                                }`}>
                                    {testResult.success ? (
                                        <CheckCircle className="h-5 w-5 mt-0.5" />
                                    ) : (
                                        <XCircle className="h-5 w-5 mt-0.5" />
                                    )}
                                    <div>
                                        <p className="font-medium">
                                            {testResult.success ? 'Email Sent' : 'Send Failed'}
                                        </p>
                                        <p className="text-sm">{testResult.message}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Setup Instructions Card */}
                {!emailStatus?.configured && (
                    <Card>
                        <CardHeader>
                            <CardTitle>SMTP Setup Instructions</CardTitle>
                            <CardDescription>
                                Configure email settings to enable team invitations and notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 text-blue-900">
                                <AlertCircle className="h-5 w-5 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium mb-1">Configuration Required</p>
                                    <p>Add the following environment variables to <code className="bg-blue-100 px-1 rounded">packages/backend/.env</code></p>
                                </div>
                            </div>

                            <div className="relative">
                                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
{`# Email / SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Agent Player
SMTP_FROM_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:41521`}
                                </pre>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={copyEnvTemplate}
                                >
                                    {copiedEnv ? (
                                        <><Check className="h-4 w-4 mr-1" /> Copied</>
                                    ) : (
                                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                                    )}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Quick Setup (Gmail):</h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                    <li>Enable 2-Factor Authentication on your Google Account</li>
                                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">myaccount.google.com/apppasswords</a></li>
                                    <li>Create an App Password for "Mail"</li>
                                    <li>Copy the 16-character password</li>
                                    <li>Add to <code className="bg-muted px-1 rounded">packages/backend/.env</code></li>
                                    <li>Restart backend: <code className="bg-muted px-1 rounded">pnpm dev</code></li>
                                    <li>Refresh this page to verify configuration</li>
                                </ol>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Other Providers:</h4>
                                <div className="grid gap-2 text-sm text-muted-foreground">
                                    <div className="flex justify-between p-2 rounded bg-muted/50">
                                        <span><strong>Outlook:</strong> smtp-mail.outlook.com</span>
                                        <span className="text-xs">Port 587</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-muted/50">
                                        <span><strong>Yahoo:</strong> smtp.mail.yahoo.com</span>
                                        <span className="text-xs">Port 587</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-muted/50">
                                        <span><strong>SendGrid:</strong> smtp.sendgrid.net</span>
                                        <span className="text-xs">Port 587</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded bg-muted/50">
                                        <span><strong>Mailgun:</strong> smtp.mailgun.org</span>
                                        <span className="text-xs">Port 587</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button variant="outline" onClick={() => window.open('/SMTP_SETUP.md', '_blank')}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Full Setup Guide
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
