import React, { useState, useMemo } from 'react';
import SettingsHeader from './components/SettingsHeader';
import SettingsSearch from './components/SettingsSearch';
import SettingsNavigation from './components/SettingsNavigation';
import SettingsContent from './components/SettingsContent';
import { settingsSections } from './utils/settingsData';
import type { SettingsSection, SettingsCategory } from './types/newTypes';

const SettingsPageNew: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory | 'all'>('all');
  const [selectedSection, setSelectedSection] = useState<string>('profile');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  // Filter sections based on search and category
  const filteredSections = useMemo(() => {
    let sections = settingsSections;

    // Filter by category
    if (selectedCategory !== 'all') {
      sections = sections.filter(section => section.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sections = sections.filter(section => 
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query) ||
        section.searchTerms.some(term => term.toLowerCase().includes(query))
      );
    }

    return sections;
  }, [searchQuery, selectedCategory]);

  const currentSection = settingsSections.find(section => section.id === selectedSection);

  const handleSave = () => {
    setShowSaveIndicator(true);
    // Simulate save operation
    setTimeout(() => setShowSaveIndicator(false), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <SettingsHeader 
        onSave={handleSave}
        showSaveIndicator={showSaveIndicator}
      />

      {/* Main Container */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
        paddingTop: '24px',
      }}>
        
        {/* Search Section */}
        <SettingsSearch 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredSections.length}
        />

        {/* Main Content Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '32px',
          marginTop: '32px',
          minHeight: '70vh',
        }}>
          
          {/* Navigation Sidebar */}
          <SettingsNavigation 
            sections={filteredSections}
            selectedCategory={selectedCategory}
            selectedSection={selectedSection}
            onCategoryChange={setSelectedCategory}
            onSectionChange={setSelectedSection}
            searchQuery={searchQuery}
          />

          {/* Content Area */}
          <SettingsContent 
            section={currentSection}
            onSave={handleSave}
          />
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '60px',
          padding: '32px',
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#7f8c8d',
            marginBottom: '12px',
          }}>
            🔒 Your settings are encrypted and stored securely
          </div>
          <div style={{
            fontSize: '12px',
            color: '#95a5a6',
          }}>
            Changes are automatically saved • Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPageNew; 