'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Globe, MapPin, Briefcase, Clock, Upload, Save, Code2, Keyboard, Check, Loader2 } from "lucide-react";
import { useDeveloperMode } from "@/contexts/developer-context";
import { useAuth } from '@/contexts/auth-context';
import { config } from '@/lib/config';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  bio: string;
  company: string;
  location: string;
  website: string;
  timezone: string;
  profilePictureUrl: string | null;
  role: string;
}

const EMPTY: ProfileData = {
  firstName: '', lastName: '', email: '', username: '',
  bio: '', company: '', location: '', website: '', timezone: 'UTC',
  profilePictureUrl: null, role: 'owner',
};

export default function ProfilePage() {
  const { devMode, setDevMode } = useDeveloperMode();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetch(`${config.backendUrl}/api/profile`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (data.success) setProfile(data.profile); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof ProfileData, value: string) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${config.backendUrl}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          username: profile.username,
          bio: profile.bio,
          company: profile.company,
          location: profile.location,
          website: profile.website,
          timezone: profile.timezone,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        // Update header name + email immediately
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        updateUser({ name: fullName || profile.username, email: profile.email });
      }
    } catch {}
    finally { setSaving(false); }
  };

  const uploadPicture = async (file: File) => {
    setUploadingPic(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${config.backendUrl}/api/profile/picture`, { method: 'POST', body: form, headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setProfile(prev => ({ ...prev, profilePictureUrl: data.url }));
        updateUser({ avatar: data.url });
      }
    } catch {}
    finally { setUploadingPic(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
          <p className="text-muted-foreground">Manage your personal information and preferences.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : saved ? <Check className="mr-2 h-4 w-4" />
            : <Save className="mr-2 h-4 w-4" />}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Picture */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload a profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                {profile.profilePictureUrl && <AvatarImage src={profile.profilePictureUrl} alt="Profile" />}
                <AvatarFallback className="text-2xl">
                  {profile.firstName ? profile.firstName[0].toUpperCase() : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPicture(f); }}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPic}>
                  {uploadingPic ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                  Upload
                </Button>
                {profile.profilePictureUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setProfile(prev => ({ ...prev, profilePictureUrl: null }))}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Recommended: Square image, at least 400×400px
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" placeholder="John" value={profile.firstName} onChange={e => set('firstName', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" placeholder="Doe" value={profile.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Mail className="mt-2.5 h-5 w-5 text-muted-foreground shrink-0" />
                <Input id="email" type="email" placeholder="john.doe@example.com" value={profile.email} onChange={e => set('email', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <User className="mt-2.5 h-5 w-5 text-muted-foreground shrink-0" />
                <Input id="username" placeholder="johndoe" value={profile.username} onChange={e => set('username', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us about yourself..." className="min-h-[100px]" value={profile.bio} onChange={e => set('bio', e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Optional details about you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <div className="flex gap-2">
                <Briefcase className="mt-2.5 h-5 w-5 text-muted-foreground shrink-0" />
                <Input id="company" placeholder="Acme Inc." value={profile.company} onChange={e => set('company', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex gap-2">
                <MapPin className="mt-2.5 h-5 w-5 text-muted-foreground shrink-0" />
                <Input id="location" placeholder="New York, USA" value={profile.location} onChange={e => set('location', e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <div className="flex gap-2">
                <Globe className="mt-2.5 h-5 w-5 text-muted-foreground shrink-0" />
                <Input id="website" type="url" placeholder="https://example.com" value={profile.website} onChange={e => set('website', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="flex gap-2">
                <Clock className="mt-2.5 h-5 w-5 text-muted-foreground shrink-0" />
                <Input id="timezone" placeholder="UTC" value={profile.timezone} onChange={e => set('timezone', e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Mode */}
      <Card className="border-amber-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Code2 className="h-5 w-5" />
            Developer Mode
          </CardTitle>
          <CardDescription>Enable advanced features and debugging tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Developer Mode</p>
              <p className="text-sm text-muted-foreground">
                Shows Developer menu in sidebar with UI Components and debugging tools.
                <br />
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Keyboard className="h-3 w-3" />
                  Ctrl + Shift + D
                </span>
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={devMode}
              onClick={() => setDevMode(!devMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${devMode ? 'bg-amber-500' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${devMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
