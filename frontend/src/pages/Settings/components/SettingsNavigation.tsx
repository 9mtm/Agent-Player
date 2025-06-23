import React from 'react';
import type { SettingsSection, SettingsCategory } from '../types/newTypes';
import { categories } from '../utils/settingsData';

interface SettingsNavigationProps {
  sections: SettingsSection[];
  selectedCategory: SettingsCategory | 'all';
  selectedSection: string;
  onCategoryChange: (category: SettingsCategory | 'all') => void;
  onSectionChange: (sectionId: string) => void;
  searchQuery: string;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  sections,
  selectedCategory,
  selectedSection,
  onCategoryChange,
  onSectionChange,
  searchQuery,
}) => {
  const groupedSections = sections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<SettingsCategory, SettingsSection[]>);

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      height: 'fit-content',
      position: 'sticky',
      top: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    }}>
      
      {/* Navigation Header */}
      <div style={{
        marginBottom: '24px',
        borderBottom: '2px solid #f8f9fa',
        paddingBottom: '16px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#2c3e50',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          📋 Categories
        </h3>
        <p style={{
          fontSize: '12px',
          color: '#7f8c8d',
          margin: '0',
        }}>
          Browse settings by category or search above
        </p>
      </div>

      {/* Category Filters */}
      <div style={{
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'grid',
          gap: '8px',
        }}>
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            const hasMatchingSections = category.id === 'all' || 
              sections.some(s => s.category === category.id);
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                disabled={!hasMatchingSections}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive 
                    ? `linear-gradient(135deg, ${category.color}, ${category.color}dd)`
                    : hasMatchingSections 
                      ? 'rgba(102, 126, 234, 0.05)'
                      : 'rgba(149, 165, 166, 0.05)',
                  color: isActive 
                    ? 'white' 
                    : hasMatchingSections 
                      ? '#2c3e50' 
                      : '#bdc3c7',
                  cursor: hasMatchingSections ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                  opacity: hasMatchingSections ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isActive ? '0 4px 16px rgba(0, 0, 0, 0.1)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (hasMatchingSections && !isActive) {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasMatchingSections && !isActive) {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '16px' }}>
                    {category.icon}
                  </span>
                  <div>
                    <div style={{ lineHeight: '1.2' }}>
                      {category.title}
                    </div>
                    {hasMatchingSections && (
                      <div style={{
                        fontSize: '11px',
                        opacity: 0.8,
                        marginTop: '2px',
                      }}>
                        {category.id === 'all' 
                          ? sections.length 
                          : sections.filter(s => s.category === category.id).length
                        } items
                      </div>
                    )}
                  </div>
                </div>
                
                {isActive && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.8)',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section List */}
      {selectedCategory !== 'all' && sections.length > 0 && (
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#7f8c8d',
            marginBottom: '12px',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⚙️</span>
            Settings in this category
          </div>
          
          <div style={{
            display: 'grid',
            gap: '4px',
          }}>
            {sections.map((section) => {
              const isActive = selectedSection === section.id;
              const categoryColor = categories.find(c => c.id === section.category)?.color || '#667eea';
              
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: isActive ? `2px solid ${categoryColor}` : '2px solid transparent',
                    background: isActive 
                      ? `${categoryColor}15` 
                      : 'transparent',
                    color: isActive ? categoryColor : '#2c3e50',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '14px' }}>
                    {section.icon}
                  </span>
                  <div>
                    <div style={{ lineHeight: '1.2' }}>
                      {section.title}
                      {section.premium && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          background: 'linear-gradient(45deg, #f39c12, #e67e22)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontWeight: '600',
                        }}>
                          PRO
                        </span>
                      )}
                      {section.beta && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          background: 'linear-gradient(45deg, #9b59b6, #8e44ad)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontWeight: '600',
                        }}>
                          BETA
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      opacity: 0.7,
                      marginTop: '2px',
                      lineHeight: '1.3',
                    }}>
                      {section.description.substring(0, 50)}...
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(102, 126, 234, 0.05)',
          borderRadius: '12px',
          border: '2px solid rgba(102, 126, 234, 0.1)',
        }}>
          <div style={{
            fontSize: '12px',
            color: '#667eea',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            🔍 Search Results
          </div>
          <div style={{
            fontSize: '11px',
            color: '#7f8c8d',
            lineHeight: '1.4',
          }}>
            Showing {sections.length} settings matching "{searchQuery}"
          </div>
        </div>
      )}

      {/* Quick Help */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(52, 152, 219, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(52, 152, 219, 0.1)',
      }}>
        <div style={{
          fontSize: '12px',
          color: '#3498db',
          fontWeight: '600',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          💡 Quick Help
        </div>
        <div style={{
          fontSize: '11px',
          color: '#7f8c8d',
          lineHeight: '1.4',
        }}>
          All settings are automatically saved and synced across your devices.
          Need help? Contact our support team.
        </div>
      </div>
    </div>
  );
};

export default SettingsNavigation; 