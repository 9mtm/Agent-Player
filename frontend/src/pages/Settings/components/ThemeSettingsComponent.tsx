import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settings';

interface ThemeSettings {
  theme_id: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  font_size: string;
  border_radius: string;
}

const ThemeSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<ThemeSettings>({
    theme_id: "default",
    primary_color: "#667eea",
    secondary_color: "#764ba2",
    background_color: "#ffffff",
    text_color: "#333333",
    font_family: "Inter, sans-serif",
    font_size: "14px",
    border_radius: "8px"
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getThemeSettings();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
      setMessage('❌ Failed to load theme settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await settingsService.updateThemeSettings(settings);
      if (response.success) {
        setMessage('🎨 Theme settings updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save theme settings:', error);
      setMessage('❌ Failed to save theme settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ThemeSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const predefinedThemes = [
    {
      id: "default",
      name: "Default",
      primary: "#667eea",
      secondary: "#764ba2",
      background: "#ffffff",
      text: "#333333"
    },
    {
      id: "dark",
      name: "Dark Mode",
      primary: "#00ff88",
      secondary: "#00cc6a",
      background: "#1a1a1a",
      text: "#ffffff"
    },
    {
      id: "ocean",
      name: "Ocean Blue",
      primary: "#4fc3f7",
      secondary: "#29b6f6",
      background: "#e3f2fd",
      text: "#0d47a1"
    },
    {
      id: "sunset",
      name: "Sunset Orange",
      primary: "#ff9800",
      secondary: "#f57c00",
      background: "#fff8e1",
      text: "#e65100"
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <div>Loading theme settings...</div>
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

      {/* Current Theme Preview */}
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
          🎨 Current Theme Preview
        </h3>

        <div style={{
          background: settings.background_color,
          color: settings.text_color,
          border: `2px solid ${settings.primary_color}`,
          borderRadius: settings.border_radius,
          padding: '20px',
          fontFamily: settings.font_family,
          fontSize: settings.font_size
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})`,
            color: 'white',
            padding: '12px',
            borderRadius: settings.border_radius,
            marginBottom: '12px'
          }}>
            Sample Header with Gradient
          </div>
          <p style={{ margin: '8px 0' }}>
            This is how your text will look with the current theme settings.
          </p>
          <button style={{
            background: settings.primary_color,
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: settings.border_radius,
            cursor: 'pointer'
          }}>
            Sample Button
          </button>
        </div>
      </div>

      {/* Predefined Themes */}
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
          🎭 Quick Theme Selection
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {predefinedThemes.map(theme => (
            <div
              key={theme.id}
              onClick={() => {
                setSettings(prev => ({
                  ...prev,
                  theme_id: theme.id,
                  primary_color: theme.primary,
                  secondary_color: theme.secondary,
                  background_color: theme.background,
                  text_color: theme.text
                }));
              }}
              style={{
                background: theme.background,
                color: theme.text,
                border: `2px solid ${settings.theme_id === theme.id ? theme.primary : '#e1e5e9'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'center' as const,
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                height: '40px',
                borderRadius: '4px',
                marginBottom: '12px'
              }}></div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                {theme.name}
              </div>
              {settings.theme_id === theme.id && (
                <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                  ✅ Selected
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
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
          🌈 Custom Colors
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Primary Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '4px' }}
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Secondary Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '4px' }}
              />
              <input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Background Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={settings.background_color}
                onChange={(e) => handleChange('background_color', e.target.value)}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '4px' }}
              />
              <input
                type="text"
                value={settings.background_color}
                onChange={(e) => handleChange('background_color', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Text Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={settings.text_color}
                onChange={(e) => handleChange('text_color', e.target.value)}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '4px' }}
              />
              <input
                type="text"
                value={settings.text_color}
                onChange={(e) => handleChange('text_color', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography Settings */}
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
          🔤 Typography & Style
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Font Family
            </label>
            <select
              value={settings.font_family}
              onChange={(e) => handleChange('font_family', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Font Size
            </label>
            <select
              value={settings.font_size}
              onChange={(e) => handleChange('font_size', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="12px">Small (12px)</option>
              <option value="14px">Medium (14px)</option>
              <option value="16px">Large (16px)</option>
              <option value="18px">Extra Large (18px)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Border Radius
            </label>
            <select
              value={settings.border_radius}
              onChange={(e) => handleChange('border_radius', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="0px">Sharp (0px)</option>
              <option value="4px">Slight (4px)</option>
              <option value="8px">Medium (8px)</option>
              <option value="12px">Rounded (12px)</option>
              <option value="20px">Very Rounded (20px)</option>
            </select>
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
              Saving Theme...
            </>
          ) : (
            <>
              🎨 Save Theme Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ThemeSettingsComponent; 