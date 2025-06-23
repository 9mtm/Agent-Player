import React, { useState } from 'react';
import { settingsService } from '../../../services/settings';

const SettingsImportExportComponent: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [importData, setImportData] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await settingsService.exportSettings();
      if (response.success) {
        // Create and download file
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dpro-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setMessage('📤 Settings exported successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      setMessage('❌ Failed to export settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      setMessage('❌ Please paste JSON data first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setImporting(true);
    try {
      const parsedData = JSON.parse(importData);
      const response = await settingsService.importSettings(parsedData);
      if (response.success) {
        setMessage('📥 Settings imported successfully!');
        setImportData('');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      setMessage('❌ Invalid JSON format or import failed');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

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

      {/* Export Section */}
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
          📤 Export Settings
        </h3>

        <p style={{ marginBottom: '20px', color: '#6c757d', lineHeight: '1.6' }}>
          Download all your settings as a JSON file. This creates a backup of your current configuration 
          that you can save, share, or import later.
        </p>

        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '16px 24px',
            background: exporting ? '#95a5a6' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: exporting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {exporting ? (
            <>
              <span>⏳</span>
              Exporting...
            </>
          ) : (
            <>
              📤 Export All Settings
            </>
          )}
        </button>
      </div>

      {/* Import Section */}
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
          📥 Import Settings
        </h3>

        <p style={{ marginBottom: '20px', color: '#6c757d', lineHeight: '1.6' }}>
          Import settings from a previously exported JSON file. This will replace your current settings.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Upload Settings File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Or Paste JSON Data
          </label>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder='Paste your exported settings JSON here...'
            rows={8}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'monospace',
              background: 'white',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={importing || !importData.trim()}
          style={{
            padding: '16px 24px',
            background: importing ? '#95a5a6' : !importData.trim() ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: importing || !importData.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {importing ? (
            <>
              <span>⏳</span>
              Importing...
            </>
          ) : (
            <>
              📥 Import Settings
            </>
          )}
        </button>

        {importData.trim() && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#856404'
          }}>
            ⚠️ <strong>Warning:</strong> Importing will replace all your current settings. Make sure to export your current settings first if you want to keep them.
          </div>
        )}
      </div>

      {/* Sample Format */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #e1e5e9'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          📋 Sample JSON Format
        </h3>

        <p style={{ marginBottom: '16px', color: '#6c757d' }}>
          Your exported settings will follow this format:
        </p>

        <pre style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '12px',
          overflow: 'auto',
          border: '1px solid #e1e5e9',
          color: '#2c3e50'
        }}>
{`{
  "export_info": {
    "exported_by": "admin@dpro-agent.com",
    "export_date": "2024-01-15T10:30:00.000Z",
    "version": "2.0.0",
    "total_sections": 7
  },
  "settings": {
    "user_profile": {
      "user_type": "individual",
      "first_name": "Admin",
      "last_name": "User",
      "email": "admin@dpro-agent.com"
    },
    "theme_settings": {
      "theme_id": "default",
      "primary_color": "#667eea"
    },
    "security_settings": {
      "two_factor_enabled": false,
      "login_notifications": true
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
};

export default SettingsImportExportComponent; 