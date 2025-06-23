import React from 'react';
import type { MarketplaceProduct } from '../types';

interface ProductGridProps {
  products: MarketplaceProduct[];
  onProductClick: (product: MarketplaceProduct) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick }) => {
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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px',
      marginBottom: '40px',
    }}>
      {products.map((product) => (
        <div
          key={product.id}
          style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}
          onClick={() => onProductClick(product)}
        >
          {/* Featured Badge */}
          {product.isFeatured && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'linear-gradient(135deg, #f39c12, #e67e22)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              zIndex: 2,
            }}>
              ✨ Featured
            </div>
          )}

          {/* Product Header */}
          <div style={{
            position: 'relative',
            padding: '24px',
            background: `linear-gradient(135deg, ${getCategoryColor(product.category)}15, ${getCategoryColor(product.category)}05)`,
          }}>
            {/* Category Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: getCategoryColor(product.category),
              color: 'white',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px',
            }}>
              <span>{getCategoryIcon(product.category)}</span>
              {product.category.replace('-', ' ')}
            </div>

            {/* Product Icon & Name */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'white',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}>
                {product.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#2c3e50',
                  margin: '0 0 4px 0',
                  lineHeight: '1.2',
                }}>
                  {product.name}
                </h3>
                <div style={{
                  fontSize: '12px',
                  color: '#7f8c8d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>by {product.developer}</span>
                  <span>•</span>
                  <span>v{product.version}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontSize: '14px',
              color: '#5a6c7d',
              margin: '0',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {product.description}
            </p>
          </div>

          {/* Product Stats */}
          <div style={{
            padding: '20px 24px',
          }}>
            {/* Stats Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#f39c12',
              }}>
                ⭐ {product.rating}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#7f8c8d',
              }}>
                {product.downloads.toLocaleString()} downloads
              </div>
            </div>

            {/* Tags */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '16px',
            }}>
              {product.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '500',
                  }}
                >
                  {tag}
                </span>
              ))}
              {product.tags.length > 3 && (
                <span style={{
                  padding: '2px 6px',
                  background: 'rgba(127, 140, 141, 0.1)',
                  color: '#7f8c8d',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '500',
                }}>
                  +{product.tags.length - 3}
                </span>
              )}
            </div>

            {/* Price & Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '800',
                color: product.isPaid ? '#e74c3c' : '#27ae60',
              }}>
                {product.isPaid ? `$${product.price}` : 'FREE'}
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                {/* Install Button */}
                <button
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle install logic here
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span>⬇️</span>
                  Install
                </button>

                {/* Favorite Button */}
                <button
                  style={{
                    padding: '8px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle favorite logic here
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#667eea';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.color = '#667eea';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ♡
                </button>
              </div>
            </div>

            {/* Last Updated */}
            <div style={{
              marginTop: '12px',
              fontSize: '10px',
              color: '#95a5a6',
              textAlign: 'center',
            }}>
              Updated {formatDate(product.lastUpdated)}
            </div>
          </div>

          {/* Hover Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }} 
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
          />
        </div>
      ))}
    </div>
  );
};

// Helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
};

export default ProductGrid; 