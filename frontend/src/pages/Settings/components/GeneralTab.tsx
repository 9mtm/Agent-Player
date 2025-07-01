import React, { useState, useEffect } from 'react';
import type { SettingsJson } from '../types';
import { settingsService } from '../../../services';
import { countriesService } from '../../../services/countries';
import type { DropdownOption } from '../../../services/countries';

interface Language {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
}

interface GeneralTabProps {
  settingsJson: SettingsJson;
  setSettingsJson: React.Dispatch<React.SetStateAction<SettingsJson>>;
  generalSubTab: string;
  setGeneralSubTab: (tab: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateUserSettings: (updates: Record<string, unknown>) => Promise<void>;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  settingsJson,
  setSettingsJson,
  generalSubTab,
  setGeneralSubTab,
  handleFileUpload,
  updateUserSettings,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // Countries, states, and cities data
  const [countries, setCountries] = useState<DropdownOption[]>([]);
  const [states, setStates] = useState<DropdownOption[]>([]);
  const [cities, setCities] = useState<DropdownOption[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  
  // Load countries and languages on component mount
  useEffect(() => {
    try {
      // Get countries for dropdown
      const countriesData = countriesService.getCountriesForDropdown();
      setCountries(countriesData);
      
      // Get common countries at the top
      const commonCountries = countriesService.getCommonCountries();
      
      // Merge common countries at the top with separator
      const allCountries = [
        ...commonCountries,
        { value: 'separator', label: '--- All Countries ---' },
        ...countriesData.filter(c => !commonCountries.some(cc => cc.value === c.value))
      ];
      setCountries(allCountries);
      
      // Get supported languages
      const languagesData = countriesService.getSupportedLanguages();
      setLanguages(languagesData);
    } catch (error) {
      console.error('Error loading countries data:', error);
    }
  }, []);
  
  // Load states when country changes
  useEffect(() => {
    if (settingsJson.individualInfo.country) {
      try {
        const statesData = countriesService.getStatesForDropdown(settingsJson.individualInfo.country);
        setStates(statesData);
        
        // Clear city if country changed
        if (settingsJson.individualInfo.city) {
          setSettingsJson(s => ({ 
            ...s, 
            individualInfo: { 
              ...s.individualInfo, 
              city: '',
              state: '' 
            } 
          }));
        }
      } catch (error) {
        console.error('Error loading states:', error);
        setStates([]);
      }
    } else {
      setStates([]);
    }
  }, [settingsJson.individualInfo.country]);
  
  // Load cities when state changes
  useEffect(() => {
    if (settingsJson.individualInfo.country && settingsJson.individualInfo.state) {
      try {
        const citiesData = countriesService.getCitiesForDropdown(
          settingsJson.individualInfo.country, 
          settingsJson.individualInfo.state
        );
        setCities(citiesData);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities([]);
      }
    } else {
      setCities([]);
    }
  }, [settingsJson.individualInfo.country, settingsJson.individualInfo.state]);

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

  // Save settings to backend
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      // Save user profile data
      if (settingsJson.systemType === 'individual') {
        await updateUserSettings({
          full_name: settingsJson.individualInfo.fullName,
          language: settingsJson.individualInfo.preferredLanguage,
          country: settingsJson.individualInfo.country,
          state: settingsJson.individualInfo.state,
          city: settingsJson.individualInfo.city,
        });
      }

      // Save preferences
      await settingsService.updateAdvancedSettings({
        system_type: settingsJson.systemType,
        default_llm: settingsJson.defaultLLM,
        // Individual info as JSON
        individual_info: settingsJson.systemType === 'individual' ? settingsJson.individualInfo : null,
        // Company info as JSON  
        company_info: settingsJson.systemType === 'company' ? {
          ...settingsJson.companyInfo,
          ...settingsJson.companyExtraInfo
        } : null,
      });

      setSaveMessage('✅ Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('❌ Failed to save settings. Please try again.');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>System Settings</h3>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          style={{
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 6,
          marginBottom: 16,
          background: saveMessage.includes('✅') ? '#e8f5e8' : '#ffeaea',
          color: saveMessage.includes('✅') ? '#2e7d32' : '#c62828',
          border: `1px solid ${saveMessage.includes('✅') ? '#81c784' : '#ef5350'}`,
        }}>
          {saveMessage}
        </div>
      )}
      
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
            👤 Individual
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              value="company"
              checked={settingsJson.systemType === 'company'}
              onChange={(e) => setSettingsJson(s => ({ ...s, systemType: e.target.value as 'individual' | 'company' }))}
              style={{ marginRight: 8 }}
            />
            🏢 Company
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
          <h4>👤 Personal Information</h4>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Full Name:
            <input 
              type="text" 
              value={settingsJson.individualInfo.fullName} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, fullName: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
              placeholder="Enter your full name"
            />
          </label>
          
          <label style={{ display: 'block', marginBottom: 12 }}>
            Preferred Language:
            <select 
              value={settingsJson.individualInfo.preferredLanguage} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, preferredLanguage: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }}
            >
              <option value="">Select language</option>
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </label>
          
          <label style={{ display: 'block', marginBottom: 12 }}>
            Country:
            <select 
              value={settingsJson.individualInfo.country} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, country: e.target.value, state: '', city: '' } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }}
            >
              <option value="">Select country</option>
              {countries.map(country => (
                country.value === 'separator' ? (
                  <option key={country.value} disabled style={{ color: '#999' }}>
                    {country.label}
                  </option>
                ) : (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                )
              ))}
            </select>
          </label>
          
          {states.length > 0 && (
            <label style={{ display: 'block', marginBottom: 12 }}>
              State/Province:
              <select 
                value={settingsJson.individualInfo.state || ''} 
                onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, state: e.target.value, city: '' } }))} 
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }}
              >
                <option value="">Select state/province</option>
                {states.map(state => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          
          {cities.length > 0 ? (
            <label style={{ display: 'block', marginBottom: 12 }}>
              City:
              <select 
                value={settingsJson.individualInfo.city} 
                onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, city: e.target.value } }))} 
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }}
              >
                <option value="">Select city</option>
                {cities.map(city => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            </label>
          ) : settingsJson.individualInfo.country && (
            <label style={{ display: 'block', marginBottom: 12 }}>
              City:
              <input 
                type="text" 
                value={settingsJson.individualInfo.city} 
                onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, city: e.target.value } }))} 
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
                placeholder="Enter your city"
              />
            </label>
          )}
          
          <label style={{ display: 'block', marginBottom: 12 }}>
            Hobbies & Interests:
            <textarea 
              value={settingsJson.individualInfo.hobbies} 
              onChange={e => setSettingsJson(s => ({ ...s, individualInfo: { ...s.individualInfo, hobbies: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6, minHeight: 80 }} 
              placeholder="Tell us about your hobbies and interests..."
            />
          </label>
        </div>
      );
    }

    if (generalSubTab === 'company' && settingsJson.systemType === 'company') {
      return (
        <div>
          <h4>🏢 Company Information</h4>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Company Name:
            <input 
              type="text" 
              value={settingsJson.companyInfo.name} 
              onChange={e => setSettingsJson(s => ({ ...s, companyInfo: { ...s.companyInfo, name: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
              placeholder="Enter company name"
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Industry:
            <input 
              type="text" 
              value={settingsJson.companyExtraInfo.industry} 
              onChange={e => setSettingsJson(s => ({ ...s, companyExtraInfo: { ...s.companyExtraInfo, industry: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
              placeholder="e.g. Technology, Healthcare, Finance"
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Company Size:
            <select 
              value={settingsJson.companyExtraInfo.size} 
              onChange={e => setSettingsJson(s => ({ ...s, companyExtraInfo: { ...s.companyExtraInfo, size: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }}
            >
              <option value="">Select company size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-1000">201-1000 employees</option>
              <option value="1000+">1000+ employees</option>
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Company Address:
            <textarea 
              value={settingsJson.companyExtraInfo.address} 
              onChange={e => setSettingsJson(s => ({ ...s, companyExtraInfo: { ...s.companyExtraInfo, address: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6, minHeight: 80 }} 
              placeholder="Enter full company address including street, city, state, country..."
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Website:
            <input 
              type="url" 
              value={settingsJson.companyExtraInfo.website} 
              onChange={e => setSettingsJson(s => ({ ...s, companyExtraInfo: { ...s.companyExtraInfo, website: e.target.value } }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
              placeholder="https://company.com"
            />
          </label>
        </div>
      );
    }

    if (generalSubTab === 'syncfiles') {
      return (
        <div>
          <h4>📁 AI Sync & Core Knowledge</h4>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Essential Files/Folders to Sync:
            <input 
              type="text" 
              placeholder="e.g. C:/Users/John/Documents, D:/Projects"
              value={settingsJson.aiSyncFiles.map(f => f.path).join(', ')} 
              onChange={e => setSettingsJson(s => ({ ...s, aiSyncFiles: e.target.value.split(',').map(path => ({ path: path.trim(), label: '', instructions: '' })) }))} 
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Upload File:
            <input 
              type="file" 
              onChange={handleFileUpload}
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginTop: 6 }} 
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