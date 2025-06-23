import React from 'react';
import type { SettingsJson } from '../types';

interface AISyncTabProps {
  settingsJson: SettingsJson;
  setSettingsJson: React.Dispatch<React.SetStateAction<SettingsJson>>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AISyncTab: React.FC<AISyncTabProps> = ({
  settingsJson,
  setSettingsJson,
  handleFileUpload,
}) => {
  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <h3>AI Sync & Core Knowledge</h3>
      
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
          AI Core Description:
        </label>
        <textarea
          value={settingsJson.aiCoreDescription}
          onChange={e => setSettingsJson(s => ({ ...s, aiCoreDescription: e.target.value }))}
          placeholder="Describe what your AI agent should know about you, your work, or your company..."
          style={{ 
            width: '100%', 
            padding: 8, 
            borderRadius: 6, 
            border: '1px solid #ccc', 
            minHeight: 80 
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
          AI Main Role:
        </label>
        <input
          type="text"
          value={settingsJson.aiMainRole}
          onChange={e => setSettingsJson(s => ({ ...s, aiMainRole: e.target.value }))}
          placeholder="e.g. Personal Assistant, Code Helper, Business Advisor..."
          style={{ 
            width: '100%', 
            padding: 8, 
            borderRadius: 6, 
            border: '1px solid #ccc' 
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
          Upload Files:
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          style={{ 
            width: '100%', 
            padding: 8, 
            borderRadius: 6, 
            border: '1px solid #ccc' 
          }}
        />
      </div>
    </div>
  );
};

export default AISyncTab; 