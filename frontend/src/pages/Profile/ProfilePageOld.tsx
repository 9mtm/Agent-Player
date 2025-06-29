import React, { useState, useEffect } from 'react';
import { settingsService, type UserProfile } from '../../services/settings';
import { authService } from '../../services/auth';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  job_title: string;
  company: string;
  department: string;
  timezone: string;
  language: string;
  country: string;
  city: string;
}

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    job_title: '',
    company: '',
    department: '',
    timezone: 'UTC',
    language: 'en',
    country: '',
    city: '',
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    marketing_emails: false,
    profile_visibility: 'public',
    show_email: false,
    show_phone: false,
  });

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getUserProfile();
      
      if (response.success && response.data) {
        const userData = response.data.user;
        setUser(userData);
        
        // Update form data
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          job_title: userData.job_title || '',
          company: userData.company || '',
          department: userData.department || '',
          timezone: userData.timezone || 'UTC',
          language: userData.language || 'en',
          country: userData.country || '',
          city: userData.city || '',
        });

        // Update preferences
        setPreferences({
          email_notifications: userData.email_notifications,
          push_notifications: userData.push_notifications,
          marketing_emails: userData.marketing_emails,
          profile_visibility: userData.profile_visibility,
          show_email: userData.show_email,
          show_phone: userData.show_phone,
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (key: string, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Update profile
      const profileResponse = await settingsService.updateUserProfile(formData);
      
      if (profileResponse.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        await loadUserProfile(); // Reload to get updated data
      } else {
        setMessage({ type: 'error', text: profileResponse.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const response = await settingsService.uploadFile(file, 'avatar', 'Profile avatar', false);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Avatar updated successfully!' });
        await loadUserProfile(); // Reload to get updated avatar
      } else {
        setMessage({ type: 'error', text: 'Failed to upload avatar' });
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setMessage({ type: 'error', text: 'Failed to upload avatar' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.display_name) {
      const names = user.display_name.split(' ');
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
        : names[0].charAt(0).toUpperCase();
    }
    return user?.username?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-semibold">👤</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Manage your personal information and account settings</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-2xl font-semibold">{getUserInitials()}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="avatar" className={`cursor-pointer inline-block px-4 py-2 rounded-md transition-colors ${
                    uploadingAvatar 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}>
                    {uploadingAvatar ? 'Uploading...' : 'Change Picture'}
                  </label>
                  <input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">PNG or JPG, max 5MB</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter job title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive notifications about account activity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreferenceChange('email_notifications', !preferences.email_notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.email_notifications ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                    <p className="text-sm text-gray-500">Receive push notifications on your device</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreferenceChange('push_notifications', !preferences.push_notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.push_notifications ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.push_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Show Email Publicly</h3>
                    <p className="text-sm text-gray-500">Display your email address on your public profile</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreferenceChange('show_email', !preferences.show_email)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.show_email ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.show_email ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2 rounded-md transition-colors ${
                  saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={loadUserProfile}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 