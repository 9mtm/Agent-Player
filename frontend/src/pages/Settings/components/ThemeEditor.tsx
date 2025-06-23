import React, { useState } from 'react';

const ThemeEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('colors');
  const [themeConfig, setThemeConfig] = useState({
    name: 'Custom Theme',
    colors: {
      primary: '#667eea',
      secondary: '#764ba2', 
      accent: '#f093fb',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#2c3e50',
    },
    fonts: {
      primary: 'Inter, sans-serif',
      heading: 'Poppins, sans-serif',
    },
    customCSS: '/* Add your custom CSS here */',
  });

  const updateColor = (key: string, value: string) => {
    setThemeConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
  };

  const exportTheme = () => {
    const dataStr = JSON.stringify(themeConfig, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${themeConfig.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`;
    link.click();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', height: '80vh' }}>
      {/* Editor Panel */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '20px', borderRadius: '12px 12px 0 0' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>🎨 Theme Editor</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Design your custom theme</p>
        </div>

        {/* Theme Name */}
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <input
            type="text"
            value={themeConfig.name}
            onChange={(e) => setThemeConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Theme Name"
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '600' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#f8f9fa' }}>
          {[
            { id: 'colors', label: '🎨 Colors' },
            { id: 'fonts', label: '🔤 Fonts' },
            { id: 'code', label: '💻 Code' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#667eea' : '#666',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', height: '300px', overflowY: 'auto' }}>
          {activeTab === 'colors' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(themeConfig.colors).map(([key, value]) => (
                <div key={key} style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>
                    {key}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => updateColor(key, e.target.value)}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateColor(key, e.target.value)}
                      style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fonts' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(themeConfig.fonts).map(([key, value]) => (
                <div key={key} style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>
                    {key} Font
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setThemeConfig(prev => ({
                      ...prev,
                      fonts: { ...prev.fonts, [key]: e.target.value }
                    }))}
                    style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'code' && (
            <div>
              <textarea
                value={themeConfig.customCSS}
                onChange={(e) => setThemeConfig(prev => ({ ...prev, customCSS: e.target.value }))}
                style={{
                  width: '100%',
                  height: '250px',
                  background: '#2d3748',
                  color: '#e2e8f0',
                  border: 'none',
                  padding: '16px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  borderRadius: '8px',
                }}
                placeholder="/* Write your custom CSS here... */"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '12px' }}>
          <button
            onClick={exportTheme}
            style={{
              flex: 1,
              padding: '12px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📦 Export Theme
          </button>
          <button
            onClick={() => alert('Published to marketplace! 🎉')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🚀 Publish
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px 12px 0 0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>🔍 Live Preview</h3>
        </div>
        
        <div style={{ padding: '20px' }}>
          <div style={{ 
            background: themeConfig.colors.background,
            color: themeConfig.colors.text,
            fontFamily: themeConfig.fonts.primary,
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #eee',
          }}>
            <h2 style={{ 
              fontFamily: themeConfig.fonts.heading,
              color: themeConfig.colors.primary,
              marginBottom: '16px' 
            }}>
              {themeConfig.name}
            </h2>
            
            <div style={{ 
              background: themeConfig.colors.surface,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: themeConfig.colors.text, marginBottom: '8px' }}>Sample Card</h3>
              <p style={{ color: themeConfig.colors.text, opacity: 0.7, marginBottom: '16px' }}>
                This is how your theme will look in practice.
              </p>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={{
                  background: `linear-gradient(135deg, ${themeConfig.colors.primary}, ${themeConfig.colors.secondary})`,
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}>
                  Primary Button
                </button>
                
                <button style={{
                  background: themeConfig.colors.surface,
                  color: themeConfig.colors.text,
                  border: `2px solid ${themeConfig.colors.primary}`,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}>
                  Secondary Button
                </button>
              </div>
            </div>
            
            <div style={{ 
              background: themeConfig.colors.accent + '20',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${themeConfig.colors.accent}50`
            }}>
              <h4 style={{ color: themeConfig.colors.accent, margin: 0 }}>Accent Section</h4>
              <p style={{ color: themeConfig.colors.text, margin: '8px 0 0 0' }}>
                Preview how accent colors work.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeEditor; 