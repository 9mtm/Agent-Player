'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Lock, Eye, EyeOff, Smartphone, Globe, AlertTriangle, Check, Save } from "lucide-react";
import { useState } from "react";

export default function SecurityPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your account security and privacy settings.
                    </p>
                </div>
            </div>

            {/* Security Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        Security Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Two-factor authentication enabled</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Strong password in use</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">3 active sessions</span>
                            </div>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                            Secure
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Password Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Password
                    </CardTitle>
                    <CardDescription>
                        Change your password regularly to keep your account secure
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                            id="current-password"
                            type="password"
                            placeholder="Enter current password"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            placeholder="Enter new password"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            placeholder="Confirm new password"
                        />
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Password requirements:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>At least 8 characters long</li>
                            <li>Contains uppercase and lowercase letters</li>
                            <li>Contains at least one number</li>
                            <li>Contains at least one special character</li>
                        </ul>
                    </div>

                    <Button>
                        Update Password
                    </Button>
                </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Two-Factor Authentication (2FA)
                    </CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Enable 2FA</Label>
                            <p className="text-sm text-muted-foreground">
                                Require a code from your phone in addition to your password
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <div className="space-y-2 p-4 bg-muted rounded-lg">
                        <p className="font-medium">Active 2FA Methods</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Authenticator App</span>
                                <Badge variant="default">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">SMS to +1 •••• •••• 1234</span>
                                <Badge variant="secondary">Backup</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline">
                            Add 2FA Method
                        </Button>
                        <Button variant="outline">
                            View Recovery Codes
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Active Sessions
                    </CardTitle>
                    <CardDescription>
                        Manage devices that are currently signed in to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">Windows PC</p>
                                    <Badge variant="default">Current</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Chrome on Windows • New York, USA
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Last active: Just now
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="space-y-1 flex-1">
                                <p className="font-medium">iPhone 14</p>
                                <p className="text-sm text-muted-foreground">
                                    Safari on iOS • New York, USA
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Last active: 2 hours ago
                                </p>
                            </div>
                            <Button variant="ghost" size="sm">
                                Revoke
                            </Button>
                        </div>

                        <div className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="space-y-1 flex-1">
                                <p className="font-medium">MacBook Pro</p>
                                <p className="text-sm text-muted-foreground">
                                    Chrome on macOS • San Francisco, USA
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Last active: Yesterday
                                </p>
                            </div>
                            <Button variant="ghost" size="sm">
                                Revoke
                            </Button>
                        </div>
                    </div>

                    <Button variant="destructive" className="w-full">
                        Revoke All Other Sessions
                    </Button>
                </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Privacy Settings
                    </CardTitle>
                    <CardDescription>
                        Control your privacy and data sharing preferences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Make Profile Public</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow others to view your profile
                            </p>
                        </div>
                        <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Show Activity Status</Label>
                            <p className="text-sm text-muted-foreground">
                                Let others see when you're online
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Analytics & Crash Reports</Label>
                            <p className="text-sm text-muted-foreground">
                                Help improve the product by sharing usage data
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Third-Party Integrations</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow third-party apps to access your data
                            </p>
                        </div>
                        <Switch />
                    </div>
                </CardContent>
            </Card>

            {/* Data Export & Deletion */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>
                        Export or delete your data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                        Download All Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                        Delete All Data
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
