import React from 'react';
import type { ProductCategory, ProductCounts } from '../types';

interface CategoryTabsProps {
  selectedCategory: ProductCategory;
  onCategoryChange: (category: ProductCategory) => void;
  productCounts: ProductCounts;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onCategoryChange,
  productCounts,
}) => {
  const categories = [
    { 
      id: 'all' as ProductCategory, 
      label: 'All Products', 
      icon: '🏪',
      description: 'Browse everything',
      count: productCounts.all 
    },
    { 
      id: 'extensions' as ProductCategory, 
      label: 'Extensions', 
      icon: '🔌',
      description: 'Integrations & add-ons',
      count: productCounts.extensions 
    },
    { 
      id: 'themes' as ProductCategory, 
      label: 'Themes', 
      icon: '🎨',
      description: 'Beautiful UI designs',
      count: productCounts.themes 
    },
    { 
      id: 'agents' as ProductCategory, 
      label: 'AI Agents', 
      icon: '🤖',
      description: 'Intelligent assistants',
      count: productCounts.agents 
    },
    { 
      id: 'mcp-servers' as ProductCategory, 
      label: 'MCP Servers', 
      icon: '🌐',
      description: 'Platform connectors',
      count: productCounts['mcp-servers'] 
    },
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '8px',
      }}>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            style={{
              position: 'relative',
              padding: '20px 16px',
              background: selectedCategory === category.id 
                ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                : 'transparent',
              color: selectedCategory === category.id ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'left',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {/* Background Glow for Active Tab */}
            {selectedCategory === category.id && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
                borderRadius: '12px',
              }} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Icon and Label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}>
                <span style={{ 
                  fontSize: '24px',
                  filter: selectedCategory === category.id ? 'brightness(1.2)' : 'none',
                }}>
                  {category.icon}
                </span>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    lineHeight: '1.2',
                  }}>
                    {category.label}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    opacity: selectedCategory === category.id ? 0.9 : 0.6,
                    marginTop: '2px',
                  }}>
                    {category.description}
                  </div>
                </div>
              </div>

              {/* Count Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  opacity: selectedCategory === category.id ? 1 : 0.8,
                }}>
                  {category.count.toLocaleString()}
                </div>
                
                {selectedCategory === category.id && (
                  <div style={{
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Active
                  </div>
                )}
              </div>
            </div>

            {/* Hover Indicator */}
            {selectedCategory !== category.id && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40px',
                height: '2px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '2px',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              }} 
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Category Description */}
      <div style={{
        marginTop: '16px',
        padding: '16px 20px',
        background: 'rgba(102, 126, 234, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(102, 126, 234, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>
            {categories.find(c => c.id === selectedCategory)?.icon}
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
              {selectedCategory === 'all' && 'Explore our complete marketplace with extensions, themes, AI agents, and MCP servers'}
              {selectedCategory === 'extensions' && 'Powerful integrations to connect your AI agents with external platforms like Slack, GitHub, and more'}
              {selectedCategory === 'themes' && 'Beautiful and customizable UI themes to personalize your experience'}
              {selectedCategory === 'agents' && 'Intelligent AI agents for various tasks like analytics, customer support, and automation'}
              {selectedCategory === 'mcp-servers' && 'Model Context Protocol servers for seamless integration with multiple platforms'}
            </div>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              {selectedCategory === 'all' && 'All categories • Free and paid options available'}
              {selectedCategory === 'extensions' && 'Easy installation • Direct platform integration • API connectivity'}
              {selectedCategory === 'themes' && 'Instant preview • Customizable • Dark and light modes'}
              {selectedCategory === 'agents' && 'Pre-trained models • Customizable behavior • Performance optimized'}
              {selectedCategory === 'mcp-servers' && 'Protocol compliant • Secure connections • Real-time sync'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs; 