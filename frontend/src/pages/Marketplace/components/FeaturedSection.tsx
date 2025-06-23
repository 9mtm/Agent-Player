import React, { useState } from 'react';
import type { MarketplaceProduct } from '../types';

interface FeaturedSectionProps {
  products: MarketplaceProduct[];
  onProductClick: (product: MarketplaceProduct) => void;
}

const FeaturedSection: React.FC<FeaturedSectionProps> = ({
  products,
  onProductClick,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (products.length === 0) return null;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % products.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + products.length) % products.length);
  };

  const currentProduct = products[currentSlide];

  return (
    <div style={{
      margin: '40px 0',
    }}>
      {/* Section Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: '800',
          color: '#2c3e50',
          margin: '0 0 8px 0',
        }}>
          ✨ Featured Products
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#7f8c8d',
          margin: '0',
        }}>
          Handpicked by our team • Top-rated • Editor's Choice
        </p>
      </div>

      {/* Main Featured Product Card */}
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
        minHeight: '400px',
      }}>
        
        {/* Background Gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${getCategoryColor(currentProduct.category)}22, ${getCategoryColor(currentProduct.category)}05)`,
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '400px',
        }}>
          
          {/* Left Side - Content */}
          <div style={{
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            
            {/* Category Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: getCategoryColor(currentProduct.category),
              color: 'white',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '24px',
              alignSelf: 'flex-start',
            }}>
              <span>{getCategoryIcon(currentProduct.category)}</span>
              {currentProduct.category.replace('-', ' ')}
            </div>

            {/* Product Info */}
            <h3 style={{
              fontSize: '36px',
              fontWeight: '800',
              color: '#2c3e50',
              margin: '0 0 16px 0',
              lineHeight: '1.2',
            }}>
              {currentProduct.name}
            </h3>

            <p style={{
              fontSize: '18px',
              color: '#5a6c7d',
              margin: '0 0 24px 0',
              lineHeight: '1.6',
            }}>
              {currentProduct.longDescription}
            </p>

            {/* Stats Row */}
            <div style={{
              display: 'flex',
              gap: '32px',
              marginBottom: '32px',
            }}>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#f39c12',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  ⭐ {currentProduct.rating}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Rating</div>
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#27ae60',
                }}>
                  {currentProduct.downloads.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Downloads</div>
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: currentProduct.isPaid ? '#e74c3c' : '#27ae60',
                }}>
                  {currentProduct.isPaid ? `$${currentProduct.price}` : 'FREE'}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Price</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
            }}>
              <button
                onClick={() => onProductClick(currentProduct)}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>👁️</span>
                View Details
              </button>

              <button
                style={{
                  padding: '16px 32px',
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.color = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>⬇️</span>
                Install Now
              </button>
            </div>
          </div>

          {/* Right Side - Visual */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
          }}>
            
            {/* Large Product Icon */}
            <div style={{
              fontSize: '120px',
              opacity: 0.8,
              filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.1))',
            }}>
              {currentProduct.icon}
            </div>

            {/* Floating Elements */}
            <div style={{
              position: 'absolute',
              top: '20%',
              right: '20%',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#27ae60',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              animation: 'float 3s ease-in-out infinite',
            }}>
              v{currentProduct.version}
            </div>

            <div style={{
              position: 'absolute',
              bottom: '30%',
              left: '15%',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#e74c3c',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              animation: 'float 3s ease-in-out infinite 1.5s',
            }}>
              {currentProduct.developer}
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        {products.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              style={{
                position: 'absolute',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                zIndex: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              ←
            </button>

            <button
              onClick={nextSlide}
              style={{
                position: 'absolute',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                zIndex: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              →
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {products.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 2,
          }}>
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: index === currentSlide 
                    ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                    : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (index !== currentSlide) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== currentSlide) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add CSS Animation */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </div>
  );
};

// Helper functions
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

export default FeaturedSection; 