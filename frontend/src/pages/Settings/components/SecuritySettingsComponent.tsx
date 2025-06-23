import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settings';

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout: number;
  password_expiry_days: number;
  login_attempts_limit: number;
}

const SecuritySettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: 1440,
    password_expiry_days: 90,
    login_attempts_limit: 5
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getSecuritySettings();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
      setMessage('❌ Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await settingsService.updateSecuritySettings(settings);
      if (response.success) {
        setMessage('🔐 Security settings updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save security settings:', error);
      setMessage('❌ Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SecuritySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <div>Loading security settings...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('❌') ? '#f8d7da' : '#d4edda',
          color: message.includes('❌') ? '#721c24' : '#155724',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 0 16px 0'
        }}>
          🔐 Two-Factor Authentication
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.two_factor_enabled}
              onChange={(e) => handleChange('two_factor_enabled', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Enable Two-Factor Authentication
          </label>
        </div>

        <p style={{ fontSize: '14px', color: '#7f8c8d', margin: 0 }}>
          Add an extra layer of security to your account by requiring a verification code
        </p>
      </div>

      {/* Login Settings */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 0 16px 0'
        }}>
          🔔 Login Notifications
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.login_notifications}
              onChange={(e) => handleChange('login_notifications', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Email me when someone logs into my account
          </label>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Login Attempts Limit
          </label>
          <select
            value={settings.login_attempts_limit}
            onChange={(e) => handleChange('login_attempts_limit', parseInt(e.target.value))}
            style={{
              width: '200px',
              padding: '8px',
              border: '2px solid #e1e5e9',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value={3}>3 attempts</option>
            <option value={5}>5 attempts</option>
            <option value={10}>10 attempts</option>
          </select>
        </div>
      </div>

      {/* Session Management */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 0 16px 0'
        }}>
          ⏰ Session Management
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Session Timeout (minutes)
          </label>
          <select
            value={settings.session_timeout}
            onChange={(e) => handleChange('session_timeout', parseInt(e.target.value))}
            style={{
              width: '200px',
              padding: '8px',
              border: '2px solid #e1e5e9',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={240}>4 hours</option>
            <option value={480}>8 hours</option>
            <option value={1440}>24 hours</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Password Expiry (days)
          </label>
          <select
            value={settings.password_expiry_days}
            onChange={(e) => handleChange('password_expiry_days', parseInt(e.target.value))}
            style={{
              width: '200px',
              padding: '8px',
              border: '2px solid #e1e5e9',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>Never</option>
          </select>
        </div>
      </div>

      {/* Security Status */}
      <div style={{
        background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '12px',
          margin: '0 0 12px 0'
        }}>
          🛡️ Security Status
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Two-Factor Auth</div>
            <div style={{ fontWeight: '600' }}>
              {settings.two_factor_enabled ? '✅ Enabled' : '❌ Disabled'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Login Notifications</div>
            <div style={{ fontWeight: '600' }}>
              {settings.login_notifications ? '✅ Enabled' : '❌ Disabled'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Session Timeout</div>
            <div style={{ fontWeight: '600' }}>
              {settings.session_timeout === 1440 ? '24 hours' : `${settings.session_timeout} min`}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            background: saving ? '#95a5a6' : 'linear-gradient(135deg, #e74c3c, #c0392b)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(231, 76, 60, 0.3)',
          }}
        >
          {saving ? (
            <>
              <span>⏳</span>
              Saving Security Settings...
            </>
          ) : (
            <>
              🔐 Save Security Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SecuritySettingsComponent; 