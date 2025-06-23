import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settings';

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  security_alerts: boolean;
  task_reminders: boolean;
  system_updates: boolean;
  email_frequency: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  notification_sound: string;
}

const NotificationSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    marketing_emails: false,
    security_alerts: true,
    task_reminders: true,
    system_updates: true,
    email_frequency: "immediate",
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
    notification_sound: "default"
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getNotificationSettings();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      setMessage('❌ Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await settingsService.updateNotificationSettings(settings);
      if (response.success) {
        setMessage('🔔 Notification settings updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setMessage('❌ Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChange = (field: keyof NotificationSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <div>Loading notification settings...</div>
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

      {/* Core Notifications */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '2px solid #e1e5e9'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          🔔 Core Notification Settings
        </h3>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>📧 Email Notifications</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Receive important updates via email
              </div>
            </div>
            <button
              onClick={() => handleToggle('email_notifications')}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: settings.email_notifications ? '#28a745' : '#dc3545',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {settings.email_notifications ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>📱 Push Notifications</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Real-time browser notifications
              </div>
            </div>
            <button
              onClick={() => handleToggle('push_notifications')}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: settings.push_notifications ? '#28a745' : '#dc3545',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {settings.push_notifications ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🔐 Security Alerts</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Important security and login notifications
              </div>
            </div>
            <button
              onClick={() => handleToggle('security_alerts')}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: settings.security_alerts ? '#28a745' : '#dc3545',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {settings.security_alerts ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Notifications */}
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
          margin: '0 0 16px 0'
        }}>
          📋 Content & Task Notifications
        </h3>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'white',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>⏰ Task Reminders</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Reminders for upcoming tasks and deadlines
              </div>
            </div>
            <button
              onClick={() => handleToggle('task_reminders')}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: settings.task_reminders ? '#28a745' : '#dc3545',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {settings.task_reminders ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'white',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🔄 System Updates</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                New features and system maintenance notifications
              </div>
            </div>
            <button
              onClick={() => handleToggle('system_updates')}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: settings.system_updates ? '#28a745' : '#dc3545',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {settings.system_updates ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'white',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>📢 Marketing Emails</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Promotional content and product updates
              </div>
            </div>
            <button
              onClick={() => handleToggle('marketing_emails')}
              style={{
                width: '60px',
                height: '30px',
                borderRadius: '15px',
                border: 'none',
                background: settings.marketing_emails ? '#28a745' : '#dc3545',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {settings.marketing_emails ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Email Frequency */}
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
          margin: '0 0 16px 0'
        }}>
          📊 Email Frequency Settings
        </h3>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            How often would you like to receive email notifications?
          </label>
          <select
            value={settings.email_frequency}
            onChange={(e) => handleChange('email_frequency', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="immediate">Immediate - Send notifications right away</option>
            <option value="hourly">Hourly - Bundle notifications every hour</option>
            <option value="daily">Daily - Send a daily summary</option>
            <option value="weekly">Weekly - Send a weekly digest</option>
          </select>
        </div>
      </div>

      {/* Quiet Hours */}
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
          margin: '0 0 16px 0'
        }}>
          🌙 Quiet Hours
        </h3>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Enable Quiet Hours</div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              No notifications during specified hours
            </div>
          </div>
          <button
            onClick={() => handleToggle('quiet_hours_enabled')}
            style={{
              width: '60px',
              height: '30px',
              borderRadius: '15px',
              border: 'none',
              background: settings.quiet_hours_enabled ? '#28a745' : '#dc3545',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {settings.quiet_hours_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {settings.quiet_hours_enabled && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Start Time
              </label>
              <input
                type="time"
                value={settings.quiet_hours_start}
                onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                End Time
              </label>
              <input
                type="time"
                value={settings.quiet_hours_end}
                onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Notification Sound */}
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
          margin: '0 0 16px 0'
        }}>
          🔊 Sound Settings
        </h3>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Notification Sound
          </label>
          <select
            value={settings.notification_sound}
            onChange={(e) => handleChange('notification_sound', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="default">Default Sound</option>
            <option value="chime">Soft Chime</option>
            <option value="ding">Simple Ding</option>
            <option value="bell">Bell</option>
            <option value="none">No Sound</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            background: saving ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
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
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}
        >
          {saving ? (
            <>
              <span>⏳</span>
              Saving Notifications...
            </>
          ) : (
            <>
              🔔 Save Notification Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettingsComponent; 