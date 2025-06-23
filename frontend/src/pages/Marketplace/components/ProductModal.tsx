import React, { useState } from 'react';
import type { MarketplaceProduct } from '../types';

interface ProductModalProps {
  product: MarketplaceProduct;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'installation' | 'reviews' | 'changelog'>('overview');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'extensions': return '#3498db';
      case 'themes': return '#e74c3c';
      case 'agents': return '#27ae60';
      case 'mcp-servers': return '#f39c12';
      default: return '#667eea';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'extensions': return '🔌';
      case 'themes': return '🎨';
      case 'agents': return '🤖';
      case 'mcp-servers': return '🌐';
      default: return '📦';
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsInstalling(false);
    setIsInstalled(true);
  };

  const handleUninstall = () => {
    setIsInstalled(false);
  };

  const reviews = [
    {
      id: '1',
      username: 'TechPro_2024',
      rating: 5,
      comment: 'Absolutely fantastic! This has revolutionized our workflow.',
      date: '2024-01-18',
      helpful: 23,
      verified: true,
    },
    {
      id: '2', 
      username: 'DevMaster',
      rating: 4,
      comment: 'Great product with excellent features. Setup was easy.',
      date: '2024-01-15',
      helpful: 18,
      verified: true,
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0, 0, 0, 0.1)',
            color: '#666',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${getCategoryColor(product.category)}15, ${getCategoryColor(product.category)}05)`,
          padding: '40px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Product Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              background: 'white',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
              flexShrink: 0,
            }}>
              {product.icon}
            </div>

            {/* Product Info */}
            <div style={{ flex: 1 }}>
              
              {/* Category Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: getCategoryColor(product.category),
                color: 'white',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '16px',
              }}>
                <span>{getCategoryIcon(product.category)}</span>
                {product.category.replace('-', ' ')}
              </div>

              {/* Product Name */}
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#2c3e50',
                margin: '0 0 8px 0',
                lineHeight: '1.2',
              }}>
                {product.name}
              </h1>
              
              <div style={{
                fontSize: '16px',
                color: '#7f8c8d',
                marginBottom: '16px',
              }}>
                by <strong>{product.developer}</strong> • v{product.version}
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '20px',
              }}>
                <div style={{ color: '#f39c12', fontSize: '16px', fontWeight: '600' }}>
                  ⭐ {product.rating}
                </div>
                <div style={{ color: '#7f8c8d', fontSize: '16px' }}>
                  {product.downloads.toLocaleString()} downloads
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  color: product.isPaid ? '#e74c3c' : '#27ae60',
                }}>
                  {product.isPaid ? `$${product.price}` : 'FREE'}
                </div>
              </div>

              {/* Install Button */}
              {!isInstalled ? (
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  style={{
                    padding: '16px 32px',
                    background: isInstalling 
                      ? 'linear-gradient(135deg, #95a5a6, #7f8c8d)'
                      : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isInstalling ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isInstalling ? (
                    <>⏳ Installing...</>
                  ) : (
                    <>⬇️ Install Now</>
                  )}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}>
                    ✅ Installed
                  </div>
                  <button
                    onClick={handleUninstall}
                    style={{
                      padding: '16px 24px',
                      background: 'rgba(231, 76, 60, 0.1)',
                      color: '#e74c3c',
                      border: '2px solid #e74c3c',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Uninstall
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'installation', label: 'Installation', icon: '⚙️' },
            { id: 'reviews', label: `Reviews (${reviews.length})`, icon: '⭐' },
            { id: 'changelog', label: 'Changelog', icon: '📝' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'installation' | 'reviews' | 'changelog')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: activeTab === tab.id ? 'white' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                color: activeTab === tab.id ? '#667eea' : '#7f8c8d',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          padding: '32px 40px',
        }}>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '16px' }}>
                  📖 Description
                </h3>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#5a6c7d' }}>
                  {product.longDescription}
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '16px' }}>
                  ✨ Key Features
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {product.features.map((feature, index) => (
                    <div key={index} style={{
                      padding: '12px 16px',
                      background: 'rgba(102, 126, 234, 0.05)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <span style={{ color: '#667eea' }}>•</span>
                      <span style={{ fontSize: '14px', color: '#2c3e50' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '16px' }}>
                  🏷️ Tags
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {product.tags.map((tag, index) => (
                    <span key={index} style={{
                      padding: '6px 12px',
                      background: 'rgba(102, 126, 234, 0.1)',
                      color: '#667eea',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Installation Tab */}
          {activeTab === 'installation' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '24px' }}>
                🚀 Installation Steps
              </h3>
              <div style={{
                background: '#1e1e1e',
                borderRadius: '12px',
                padding: '20px',
                color: '#00ff00',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '14px',
              }}>
                <div>$ dpro install {product.name.toLowerCase().replace(' ', '-')}</div>
                <div>$ dpro activate {product.name.toLowerCase().replace(' ', '-')}</div>
                <div>$ dpro verify installation</div>
              </div>
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(241, 196, 15, 0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#f39c12',
              }}>
                💡 Requires Dpro CLI v2.0 or higher
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '24px' }}>
                ⭐ User Reviews
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{
                    background: 'white',
                    border: '1px solid #f0f0f0',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#2c3e50' }}>{review.username}</div>
                        <div style={{ color: '#f39c12' }}>{'⭐'.repeat(review.rating)}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{review.date}</div>
                    </div>
                    <p style={{ fontSize: '14px', color: '#2c3e50', lineHeight: '1.5' }}>
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Changelog Tab */}
          {activeTab === 'changelog' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '24px' }}>
                📝 Version History
              </h3>
              <div style={{
                background: 'rgba(39, 174, 96, 0.1)',
                border: '1px solid rgba(39, 174, 96, 0.3)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#27ae60', marginBottom: '8px' }}>
                  v{product.version} - Latest
                </div>
                <p style={{ fontSize: '14px', color: '#2c3e50', margin: '0' }}>
                  {product.changelog}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal; 