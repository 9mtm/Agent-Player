import React, { useState } from 'react';
import type { SettingsSection } from '../types/newTypes';
import ThemeEditor from './ThemeEditor';
import SecuritySettingsComponent from './SecuritySettingsComponent';
import SettingsLogsComponent from './SettingsLogsComponent';
import ThemeSettingsComponent from './ThemeSettingsComponent';
import NotificationSettingsComponent from './NotificationSettingsComponent';
import AIModelsSettingsComponent from './AIModelsSettingsComponent';
import IntegrationsSettingsComponent from './IntegrationsSettingsComponent';
import AdvancedSettingsComponent from './AdvancedSettingsComponent';
import SettingsImportExportComponent from './SettingsImportExportComponent';
import AccountSecurityComponent from './AccountSecurityComponent';
import BillingPlansComponent from './BillingPlansComponent';
import {
  PrivacyControlsComponent,
  LayoutSettingsComponent,
  TypographyComponent,
  PromptTemplatesComponent,
  ModelTrainingComponent,
  APISettingsComponent,
  WebhooksComponent,
  DataImportComponent,
  EmailSettingsComponent,
  MobileAlertsComponent,
  DeveloperToolsComponent,
  BackupRestoreComponent
} from './AdditionalSettingsComponents';
import config from '../../../config';

interface ProfileData {
  user_type: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  bio: string;
  country: string;
  city: string;
  current_position?: string;
  company_registration_number?: string;
  industry?: string;
  company_size?: string;
  founded_year?: number;
  subscription_type?: string;
}

// Marketplace Component
const ThemeMarketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const themes = [
    {
      id: 1,
      name: 'Dark Matrix',
      author: 'TechDesigner',
      description: 'Professional dark theme with green accents',
      downloads: 1234,
      rating: 4.8,
      price: 'Free',
      preview: '/theme-previews/dark-matrix.jpg',
      colors: { primary: '#00ff88', background: '#0d1117' }
    },
    {
      id: 2,
      name: 'Sunset Gradient',
      author: 'ColorMaster',
      description: 'Warm gradient theme perfect for creative work',
      downloads: 892,
      rating: 4.6,
      price: '$2.99',
      preview: '/theme-previews/sunset.jpg',
      colors: { primary: '#ff6b6b', background: '#ffe66d' }
    },
    {
      id: 3,
      name: 'Ocean Breeze',
      author: 'WaveDesign',
      description: 'Cool blue theme inspired by the ocean',
      downloads: 567,
      rating: 4.9,
      price: 'Free',
      preview: '/theme-previews/ocean.jpg',
      colors: { primary: '#4fc3f7', background: '#e3f2fd' }
    },
  ];

  const filteredThemes = themes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'all' || theme.price === selectedCategory)
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
          🏪 Theme Marketplace
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          Discover and install community themes or publish your own creations
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search themes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '12px 16px',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '12px 16px',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
          }}
        >
          <option value="all">All Themes</option>
          <option value="Free">Free Themes</option>
          <option value="$2.99">Premium Themes</option>
        </select>

        <button
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🎨 Create Theme
        </button>
      </div>

      {/* Theme Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredThemes.map(theme => (
          <div
            key={theme.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.transform = 'translateY(-4px)';
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {/* Preview */}
            <div
              style={{
                height: '120px',
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.background})`,
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.9)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                color: theme.price === 'Free' ? '#27ae60' : '#e74c3c',
              }}>
                {theme.price}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                  {theme.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#f39c12', fontSize: '14px' }}>⭐</span>
                  <span style={{ fontSize: '14px', color: '#7f8c8d' }}>{theme.rating}</span>
                </div>
              </div>

              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#7f8c8d', lineHeight: '1.4' }}>
                {theme.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#95a5a6' }}>
                  by {theme.author}
                </span>
                <span style={{ fontSize: '12px', color: '#95a5a6' }}>
                  📥 {theme.downloads.toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: theme.price === 'Free' ? '#27ae60' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {theme.price === 'Free' ? 'Install' : 'Buy Now'}
                </button>
                <button
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    color: '#7f8c8d',
                    border: '1px solid #e1e5e9',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Section */}
      <div style={{
        marginTop: '40px',
        background: 'linear-gradient(135deg, #f093fb, #f5576c)',
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        textAlign: 'center' as const,
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>
          🚀 Share Your Creativity
        </h3>
        <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>
          Create amazing themes and share them with the community. Earn from your designs!
        </p>
        <button
          style={{
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          📤 Submit Your Theme
        </button>
      </div>
    </div>
  );
};

// Complete Settings Sidebar - All Sections
const CompleteSettingsSidebar = () => {
  const settingsSections = [
    // Profile & Account
    { id: 'profile', title: 'Profile Settings', icon: '👤', category: 'Account', description: 'Personal information and account details' },
    { id: 'account', title: 'Account Security', icon: '🔐', category: 'Account', description: 'Security settings and password management' },
    { id: 'billing', title: 'Billing & Plans', icon: '💳', category: 'Account', description: 'Subscription management and billing' },
    { id: 'privacy', title: 'Privacy Controls', icon: '🔒', category: 'Account', description: 'Data privacy and user permissions' },
    
    // Appearance & Themes
    { id: 'themes', title: 'Theme Editor', icon: '🎨', category: 'Appearance', description: 'Create and customize themes' },
    { id: 'marketplace', title: 'Theme Marketplace', icon: '🏪', category: 'Appearance', description: 'Browse and download community themes' },
    { id: 'theme', title: 'Theme Settings', icon: '🌈', category: 'Appearance', description: 'Visual customization and colors' },
    { id: 'layout', title: 'Layout Settings', icon: '📐', category: 'Appearance', description: 'Interface layout and spacing' },
    { id: 'fonts', title: 'Typography', icon: '🔤', category: 'Appearance', description: 'Font settings and text styling' },
    
    // AI & Models
    { id: 'models', title: 'AI Models', icon: '🤖', category: 'AI', description: 'AI model configuration and API keys' },
    { id: 'prompts', title: 'Prompt Templates', icon: '📝', category: 'AI', description: 'Custom prompt templates and management' },
    { id: 'training', title: 'Model Training', icon: '🧠', category: 'AI', description: 'AI model training and fine-tuning' },
    { id: 'api', title: 'API Settings', icon: '🔗', category: 'AI', description: 'API configuration and rate limits' },
    
    // Integrations
    { id: 'integrations', title: 'Integrations', icon: '🔌', category: 'Integrations', description: 'Third-party service integrations' },
    { id: 'webhooks', title: 'Webhooks', icon: '🪝', category: 'Integrations', description: 'Webhook configuration and management' },
    { id: 'exports', title: 'Data Export', icon: '📤', category: 'Integrations', description: 'Export data and configurations' },
    { id: 'imports', title: 'Data Import', icon: '📥', category: 'Integrations', description: 'Import data and configurations' },
    
    // Notifications
    { id: 'notifications', title: 'Notifications', icon: '🔔', category: 'Notifications', description: 'General notification preferences' },
    { id: 'email', title: 'Email Settings', icon: '📧', category: 'Notifications', description: 'Email notification configuration' },
    { id: 'mobile', title: 'Mobile Alerts', icon: '📱', category: 'Notifications', description: 'Mobile push notification settings' },
    
    // Advanced
    { id: 'advanced', title: 'Advanced Settings', icon: '⚙️', category: 'Advanced', description: 'Developer and advanced configuration' },
    { id: 'developer', title: 'Developer Tools', icon: '👨‍💻', category: 'Advanced', description: 'Development tools and debugging' },
    { id: 'logs', title: 'Activity Logs', icon: '📊', category: 'Advanced', description: 'View system activity and logs' },
    { id: 'backup', title: 'Backup & Restore', icon: '💾', category: 'Advanced', description: 'System backup and restoration' },
  ];

  return settingsSections;
};

// Dynamic Profile Selector Component - English
const DynamicProfileSelector: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData>({
    user_type: 'individual',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    bio: '',
    country: 'SA',
    city: '',
    subscription_type: 'free'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeUserType, setActiveUserType] = useState<string>('individual');
  const [dataLoaded, setDataLoaded] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setProfileData((prev: ProfileData) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserTypeChange = (newType: string) => {
    setActiveUserType(newType);
    setProfileData((prev: ProfileData) => ({
      ...prev,
      user_type: newType,
      subscription_type: newType === 'individual' ? 'free' : 'basic'
    }));
  };

  // Load profile data on component mount
  const loadProfileData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.api.baseURL}/api/v1/settings/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setProfileData(prev => ({
            ...prev,
            ...result.data
          }));
          setActiveUserType(result.data.user_type || 'individual');
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
    setDataLoaded(true);
  };

  // Load data when component mounts
  React.useEffect(() => {
    if (!dataLoaded) {
      loadProfileData();
    }
  }, [dataLoaded]);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.api.baseURL}/api/v1/settings/profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessage('✅ Profile updated successfully!');
        } else {
          setMessage('❌ Failed to update profile');
        }
      } else {
        setMessage('❌ Failed to update profile');
      }
    } catch (error) {
      setMessage('❌ Error updating profile');
      console.error('Error:', error);
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

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

      {/* Account Type Selection */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 0 16px 0'
        }}>
          👤 Account Type
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { id: 'individual', label: 'Individual', icon: '👤', desc: 'Personal account for individuals' },
            { id: 'company', label: 'Company', icon: '🏢', desc: 'Business account for companies' },
            { id: 'freelancer', label: 'Freelancer', icon: '💼', desc: 'Professional account for freelancers' },
            { id: 'organization', label: 'Organization', icon: '🏛️', desc: 'Account for organizations' }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => handleUserTypeChange(type.id)}
              style={{
                padding: '16px',
                background: activeUserType === type.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                border: activeUserType === type.id ? '2px solid white' : '2px solid transparent',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'center' as const,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{type.icon}</div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{type.label}</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Individual Form */}
      {activeUserType === 'individual' && (
        <>
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
              gap: '8px',
              margin: '0 0 20px 0'
            }}>
              👤 Personal Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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
                    boxSizing: 'border-box' as const,
                  }}
                  placeholder="Ahmed"
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
                    boxSizing: 'border-box' as const,
                  }}
                  placeholder="Al-Abdullah"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                  Current Position
                </label>
                <input
                  type="text"
                  value={profileData.current_position || ''}
                  onChange={(e) => handleInputChange('current_position', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box' as const,
                  }}
                  placeholder="Software Developer"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Company Form */}
      {(activeUserType === 'company' || activeUserType === 'organization') && (
        <>
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
              gap: '8px',
              margin: '0 0 20px 0'
            }}>
              🏢 Company Information
            </h3>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.company_name || ''}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box' as const,
                    }}
                    placeholder="DPRO Technology Company"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={profileData.company_registration_number || ''}
                    onChange={(e) => handleInputChange('company_registration_number', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box' as const,
                    }}
                    placeholder="1010123456"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                    Industry
                  </label>
                  <select
                    value={profileData.industry || ''}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box' as const,
                    }}
                  >
                    <option value="">Select Industry</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                    <option value="retail">Retail</option>
                    <option value="construction">Construction</option>
                    <option value="consulting">Consulting</option>
                    <option value="government">Government</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                    Company Size
                  </label>
                  <select
                    value={profileData.company_size || ''}
                    onChange={(e) => handleInputChange('company_size', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box' as const,
                    }}
                  >
                    <option value="">Select Size</option>
                    <option value="startup">Startup (1-10 employees)</option>
                    <option value="small">Small (11-50 employees)</option>
                    <option value="medium">Medium (51-200 employees)</option>
                    <option value="large">Large (201-1000 employees)</option>
                    <option value="enterprise">Enterprise (1000+ employees)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                    Founded Year
                  </label>
                  <input
                    type="number"
                    value={profileData.founded_year || ''}
                    onChange={(e) => handleInputChange('founded_year', parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box' as const,
                    }}
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shared Contact Information */}
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
          gap: '8px',
          margin: '0 0 20px 0'
        }}>
          📧 Contact Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
                boxSizing: 'border-box' as const,
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
                boxSizing: 'border-box' as const,
              }}
              placeholder="+966 50 123 4567"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            {activeUserType === 'individual' ? 'Personal Bio' : 'Company Description'}
          </label>
          <textarea
            value={profileData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical' as const,
              boxSizing: 'border-box' as const,
            }}
            placeholder={
              activeUserType === 'individual' 
                ? 'Tell us about yourself and your experience...' 
                : 'Describe your company and services...'
            }
          />
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' as const, marginTop: '32px' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '16px 48px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}
        >
          {loading ? (
            <>
              <span>⏳</span>
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

interface SettingsContentProps {
  section?: SettingsSection;
  onSave: () => void;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ section, onSave }) => {
  if (!section) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center' as const,
        color: '#7f8c8d',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Select a Setting</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>
          Choose from {CompleteSettingsSidebar().length} available settings categories
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        color: 'white',
        padding: '32px',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
      }}>
        <h2 style={{ fontSize: '24px', margin: '0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>{section.icon}</span>
          {section.title}
        </h2>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>{section.description}</p>
      </div>

      {/* Content */}
      <div style={{ padding: '32px' }}>
        <div style={{ fontSize: '16px', color: '#2c3e50', lineHeight: '1.6' }}>
          Configure your <strong>{section.title.toLowerCase()}</strong> preferences here. 
          All changes are automatically saved and will take effect immediately.
        </div>

        {/* Settings Controls */}
        <div style={{ marginTop: '32px' }}>
          {section.id === 'profile' && (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <DynamicProfileSelector />
            </div>
          )}

          {section.id === 'themes' && <ThemeEditor />}
          
          {section.id === 'marketplace' && <ThemeMarketplace />}

          {section.id === 'theme' && <ThemeSettingsComponent />}

          {section.id === 'security' && <SecuritySettingsComponent />}

          {section.id === 'notifications' && <NotificationSettingsComponent />}

          {section.id === 'models' && <AIModelsSettingsComponent />}

          {section.id === 'integrations' && <IntegrationsSettingsComponent />}

          {section.id === 'advanced' && <AdvancedSettingsComponent />}

          {section.id === 'logs' && <SettingsLogsComponent />}

          {section.id === 'exports' && <SettingsImportExportComponent />}

          {section.id === 'account' && <AccountSecurityComponent />}
          {section.id === 'billing' && <BillingPlansComponent />}
          {section.id === 'privacy' && <PrivacyControlsComponent />}
          {section.id === 'layout' && <LayoutSettingsComponent />}
          {section.id === 'fonts' && <TypographyComponent />}
          {section.id === 'prompts' && <PromptTemplatesComponent />}
          {section.id === 'training' && <ModelTrainingComponent />}
          {section.id === 'api' && <APISettingsComponent />}
          {section.id === 'webhooks' && <WebhooksComponent />}
          {section.id === 'imports' && <DataImportComponent />}
          {section.id === 'email' && <EmailSettingsComponent />}
          {section.id === 'mobile' && <MobileAlertsComponent />}
          {section.id === 'developer' && <DeveloperToolsComponent />}
          {section.id === 'backup' && <BackupRestoreComponent />}

          {/* Default content for non-implemented sections */}
          {![
            'profile', 'themes', 'marketplace', 'theme', 'notifications', 'models', 
            'integrations', 'exports', 'advanced', 'logs', 'account', 'billing', 
            'privacy', 'layout', 'fonts', 'prompts', 'training', 'api', 'webhooks', 
            'imports', 'email', 'mobile', 'developer', 'backup'
          ].includes(section.id) && (
            <div style={{
              padding: '24px',
              background: 'rgba(241, 196, 15, 0.1)',
              borderRadius: '12px',
              textAlign: 'center' as const,
            }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚧</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Settings Under Development</div>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                This section will be available in the next update!
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '32px', textAlign: 'right' as const }}>
          <button
            onClick={onSave}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent; 