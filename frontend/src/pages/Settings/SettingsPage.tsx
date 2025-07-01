import React from 'react';
import { useSettings } from './hooks/useSettings';
import {
  GeneralTab,
  ProfileTab,
  LLMTab,
  KnowledgeTab,
  UpdatesTab,
  AISyncTab,
} from './components';
import { TAB_LIST } from './utils/constants';

const SettingsPage: React.FC = () => {
  const {
    // State
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    generalSubTab,
    setGeneralSubTab,
    user,
    profile,
    loading,
    error,
    showDeleteInfo,
    settingsJson,
    setSettingsJson,
    
    // Actions
    navigate,
    handleDeleteRequest,
    handleShareErrorsChange,
    handleFileUpload,
    updateUserSettings,
  } = useSettings();

  // Render appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab
            settingsJson={settingsJson}
            setSettingsJson={setSettingsJson}
            generalSubTab={generalSubTab}
            setGeneralSubTab={setGeneralSubTab}
            handleFileUpload={handleFileUpload}
            user={user}
            updateUserSettings={updateUserSettings}
          />
        );

      case 'profile':
        return (
          <ProfileTab
            user={user}
            profile={profile}
            showDeleteInfo={showDeleteInfo}
            handleDeleteRequest={handleDeleteRequest}
            handleShareErrorsChange={handleShareErrorsChange}
          />
        );

      case 'llm':
        return (
          <LLMTab
            settingsJson={settingsJson}
            setSettingsJson={setSettingsJson}
          />
        );

      case 'knowledge':
        return <KnowledgeTab />;

      case 'updates':
        return <UpdatesTab navigate={navigate} />;

      case 'aisync':
        return (
          <AISyncTab
            settingsJson={settingsJson}
            setSettingsJson={setSettingsJson}
            handleFileUpload={handleFileUpload}
          />
        );

      default:
        return (
          <div style={{ padding: '24px 0' }}>
            <h3>Settings</h3>
            <div style={{ color: '#888' }}>Select a tab to configure settings.</div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#e53935' }}>
        <div>Error: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: 16, 
            padding: '8px 16px', 
            background: '#1976d2', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer' 
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      height: '100vh', 
      width: '100vw', 
      padding: 0, 
      margin: 0, 
      background: '#f8f8f8' 
    }}>
      <div style={{ 
        padding: '24px 32px 0 32px', 
        background: 'none', 
        zIndex: 2 
      }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        
        <button
          onClick={() => navigate('/registration')}
          style={{ 
            margin: '16px 0 24px 0', 
            padding: '10px 24px', 
            borderRadius: 8, 
            background: '#1976d2', 
            color: '#fff', 
            border: 'none', 
            fontWeight: 600, 
            fontSize: 15, 
            cursor: 'pointer' 
          }}
        >
          Registration & Profile
        </button>
        
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          borderBottom: '2px solid #eee', 
          marginBottom: 24 
        }}>
          {TAB_LIST.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid #1976d2' : '3px solid transparent',
                color: activeTab === tab.key ? '#1976d2' : '#333',
                fontWeight: activeTab === tab.key ? 800 : 600,
                fontSize: 18,
                padding: '12px 24px 8px 0',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div style={{ minHeight: 200 }}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 