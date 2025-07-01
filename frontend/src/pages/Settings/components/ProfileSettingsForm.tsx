import React, { useState, useEffect } from 'react';
import { settingsService, type UserProfile } from '../../../services/settings';

const ProfileSettingsForm: React.FC = () => {
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    first_name: '',
    last_name: '',
    display_name: '',
    email: '',
    phone: '',
    bio: '',
    job_title: '',
    company: '',
    country: '',
    city: '',
    skills: [],
    timezone: 'UTC',
    theme: 'light',
    email_notifications: true,
    push_notifications: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getUserProfile();
      if (response.success) {
        setProfileData(response.data.user);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | boolean | string[]) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await settingsService.updateUserProfile(profileData);
      
      if (response.success) {
        setMessage('Profile updated successfully! ✅');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('An error occurred while updating');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profileData.email) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <div>Loading profile...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Basic Information Section */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👤 Basic Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              First Name *
            </label>
            <input
              type="text"
              value={profileData.first_name || ''}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s',
              }}
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Last Name *
            </label>
            <input
              type="text"
              value={profileData.last_name || ''}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Display Name
          </label>
          <input
            type="text"
            value={profileData.display_name || ''}
            onChange={(e) => handleInputChange('display_name', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
            }}
            placeholder="How you'd like to be displayed"
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Bio
          </label>
          <textarea
            value={profileData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
            }}
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>

      {/* Contact Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📧 Contact Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={profileData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="+966 50 123 4567"
            />
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💼 Professional Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Job Title
            </label>
            <input
              type="text"
              value={profileData.job_title || ''}
              onChange={(e) => handleInputChange('job_title', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Company
            </label>
            <input
              type="text"
              value={profileData.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="DPRO Technologies"
            />
          </div>
        </div>
      </div>

      {/* Location Settings */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🌍 Location & Preferences
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Country
            </label>
            <select
              value={profileData.country || ''}
              onChange={(e) => handleInputChange('country', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="">Select Country</option>
              <option value="SA">🇸🇦 Saudi Arabia</option>
              <option value="AE">🇦🇪 UAE</option>
              <option value="EG">🇪🇬 Egypt</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              City
            </label>
            <input
              type="text"
              value={profileData.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
                              placeholder="Business District"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Timezone
            </label>
            <select
              value={profileData.timezone || 'UTC'}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="UTC">UTC</option>
              <option value="Asia/Riyadh">Asia/Riyadh</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Africa/Cairo">Africa/Cairo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔔 Notification Preferences
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={profileData.email_notifications || false}
              onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px', color: '#2c3e50' }}>Email Notifications</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={profileData.push_notifications || false}
              onChange={(e) => handleInputChange('push_notifications', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px', color: '#2c3e50' }}>Push Notifications</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'right' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: 'auto',
          }}
        >
          {loading ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
              Saving...
            </>
          ) : (
            <>
              💾 Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettingsForm; 