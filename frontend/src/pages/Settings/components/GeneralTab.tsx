import React from 'react';
import type { SettingsJson } from '../types';

interface GeneralTabProps {
  settingsJson: SettingsJson;
  setSettingsJson: React.Dispatch<React.SetStateAction<SettingsJson>>;
  generalSubTab: string;
  setGeneralSubTab: (tab: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  settingsJson,
  setSettingsJson,
  generalSubTab,
  setGeneralSubTab,
  handleFileUpload,
}) => {
  const generalIndividualSubTabs = [
    { key: 'personal', label: 'Personal Info' },
    { key: 'preferences', label: 'Preferences' },
    { key: 'professional', label: 'Professional' },
    { key: 'syncfiles', label: 'Sync & Files' },
  ];

  const generalCompanySubTabs = [
    { key: 'company', label: 'Company Info' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'policies', label: 'Policies' },
    { key: 'syncfiles', label: 'Sync & Files' },
  ];

  const currentSubTabs = settingsJson.systemType === 'individual' 
    ? generalIndividualSubTabs 
    : generalCompanySubTabs;

  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <h3>System Settings</h3>
      
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #eee', marginBottom: 16 }}>
        {currentSubTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setGeneralSubTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: generalSubTab === tab.key ? '3px solid #1976d2' : '3px solid transparent',
              color: generalSubTab === tab.key ? '#1976d2' : '#333',
              fontWeight: generalSubTab === tab.key ? 700 : 500,
              fontSize: 16,
              padding: '8px 18px 6px 0',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* System type selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>System Type:</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              value="individual"
              checked={settingsJson.systemType === 'individual'}
              onChange={(e) => setSettingsJson(s => ({ ...s, systemType: e.target.value as 'individual' | 'company' }))}
              style={{ marginRight: 8 }}
            />
            Individual
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              value="company"
              checked={settingsJson.systemType === 'company'}
              onChange={(e) => setSettingsJson(s => ({ ...s, systemType: e.target.value as 'individual' | 'company' }))}
              style={{ marginRight: 8 }}
            />
            Company
          </label>
        </div>
      </div>

      {/* Sub-tab content */}
      {renderSubTabContent()}
    </div>
  );

  function renderSubTabContent() {
    if (generalSubTab === 'personal' && settingsJson.systemType === 'individual') {
      return (
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Full Name:
            <input 
              type="text" 
              value={settingsJson.individualInfo.fullName} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, fullName: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Preferred Language:
            <input 
              type="text" 
              value={settingsJson.individualInfo.preferredLanguage} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, preferredLanguage: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Country:
            <input 
              type="text" 
              value={settingsJson.individualInfo.country} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, country: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            City:
            <input 
              type="text" 
              value={settingsJson.individualInfo.city} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, city: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Hobbies & Interests:
            <textarea 
              value={settingsJson.individualInfo.hobbies} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, hobbies: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4, minHeight: 60 }} 
            />
          </label>
        </div>
      );
    }

    if (generalSubTab === 'company' && settingsJson.systemType === 'company') {
      return (
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Company Name:
            <input 
              type="text" 
              value={settingsJson.companyInfo.name} 
              onChange={e => setSettingsJson(s => ({ ...s, companyInfo: { ...s.companyInfo, name: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Industry:
            <input 
              type="text" 
              value={settingsJson.companyExtraInfo.industry} 
              onChange={e => setSettingsJson(s => ({ ...s, companyExtraInfo: { ...s.companyExtraInfo, industry: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Company Size:
            <select 
              value={settingsJson.companyExtraInfo.size} 
              onChange={e => setSettingsJson(s => ({ ...s, companyExtraInfo: { ...s.companyExtraInfo, size: e.target.value } }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }}
            >
              <option value="">Select size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-1000">201-1000 employees</option>
              <option value="1000+">1000+ employees</option>
            </select>
          </label>
        </div>
      );
    }

    if (generalSubTab === 'syncfiles') {
      return (
        <div>
          <h4>AI Sync & Core Knowledge</h4>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Essential Files/Folders to Sync:
            <input 
              type="text" 
              placeholder="e.g. C:/Users/John/Documents, D:/Projects"
              value={settingsJson.aiSyncFiles.map(f => f.path).join(', ')} 
              onChange={e => setSettingsJson(s => ({ ...s, aiSyncFiles: e.target.value.split(',').map(path => ({ path: path.trim(), label: '', instructions: '' })) }))} 
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Upload File:
            <input 
              type="file" 
              onChange={handleFileUpload}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} 
            />
          </label>
        </div>
      );
    }

    return (
      <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
        Select a sub-tab to configure settings
      </div>
    );
  }
};

export default GeneralTab; 