import React from 'react';
import type { FilterOptions } from '../types';

interface FiltersPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  productCount: number;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filters,
  onFiltersChange,
  productCount,
}) => {
  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      pricing: 'all',
      rating: 0,
      compatibility: 'all',
      sortBy: 'popularity',
    });
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      height: 'fit-content',
      position: 'sticky',
      top: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#2c3e50',
          margin: '0',
        }}>
          🔍 Filters
        </h3>
        <button
          onClick={clearFilters}
          style={{
            padding: '6px 12px',
            background: 'rgba(102, 126, 234, 0.1)',
            color: '#667eea',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#667eea';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            e.currentTarget.style.color = '#667eea';
          }}
        >
          Clear All
        </button>
      </div>

      {/* Results Count */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
        borderRadius: '12px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '800',
          color: '#667eea',
        }}>
          {productCount.toLocaleString()}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#7f8c8d',
        }}>
          Products found
        </div>
      </div>

      {/* Pricing Filter */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '12px',
          display: 'block',
        }}>
          💰 Pricing
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'all', label: 'All Products', count: '2,847' },
            { value: 'free', label: 'Free Only', count: '1,523' },
            { value: 'paid', label: 'Paid Only', count: '1,324' },
          ].map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: filters.pricing === option.value 
                  ? 'rgba(102, 126, 234, 0.1)' 
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (filters.pricing !== option.value) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (filters.pricing !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name="pricing"
                  value={option.value}
                  checked={filters.pricing === option.value}
                  onChange={(e) => updateFilter('pricing', e.target.value as any)}
                  style={{
                    accentColor: '#667eea',
                  }}
                />
                <span style={{
                  fontSize: '13px',
                  color: '#2c3e50',
                }}>
                  {option.label}
                </span>
              </div>
              <span style={{
                fontSize: '11px',
                color: '#7f8c8d',
                fontWeight: '500',
              }}>
                {option.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '12px',
          display: 'block',
        }}>
          ⭐ Minimum Rating
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 0, label: 'All Ratings', stars: '' },
            { value: 4, label: '4+ Stars', stars: '⭐⭐⭐⭐' },
            { value: 4.5, label: '4.5+ Stars', stars: '⭐⭐⭐⭐⭐' },
          ].map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: filters.rating === option.value 
                  ? 'rgba(102, 126, 234, 0.1)' 
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (filters.rating !== option.value) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (filters.rating !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name="rating"
                  value={option.value}
                  checked={filters.rating === option.value}
                  onChange={(e) => updateFilter('rating', parseFloat(e.target.value))}
                  style={{
                    accentColor: '#667eea',
                  }}
                />
                <span style={{
                  fontSize: '13px',
                  color: '#2c3e50',
                }}>
                  {option.label}
                </span>
              </div>
              <span style={{ fontSize: '12px' }}>
                {option.stars}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Compatibility Filter */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '12px',
          display: 'block',
        }}>
          🔧 Compatibility
        </label>
        <select
          value={filters.compatibility}
          onChange={(e) => updateFilter('compatibility', e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e1e5e9',
            background: 'white',
            fontSize: '13px',
            color: '#2c3e50',
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e1e5e9';
          }}
        >
          <option value="all">All Versions</option>
          <option value="v2.0+">v2.0 and above</option>
          <option value="v1.5+">v1.5 and above</option>
          <option value="v1.0+">v1.0 and above</option>
        </select>
      </div>

      {/* Popular Tags */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '12px',
          display: 'block',
        }}>
          🏷️ Popular Tags
        </label>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {[
            'slack', 'github', 'automation', 'ai', 'analytics', 
            'dark-theme', 'integration', 'productivity'
          ].map((tag) => (
            <button
              key={tag}
              style={{
                padding: '6px 10px',
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                e.currentTarget.style.color = '#667eea';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '16px',
        background: 'rgba(39, 174, 96, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(39, 174, 96, 0.2)',
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#27ae60',
          marginBottom: '8px',
        }}>
          💡 Quick Filters
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <button
            onClick={() => onFiltersChange({
              ...filters,
              pricing: 'free',
              rating: 4,
            })}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              color: '#27ae60',
              border: '1px solid rgba(39, 174, 96, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(39, 174, 96, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            🆓 Top Free Products
          </button>
          <button
            onClick={() => onFiltersChange({
              ...filters,
              sortBy: 'newest',
            })}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              color: '#27ae60',
              border: '1px solid rgba(39, 174, 96, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(39, 174, 96, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            🆕 Recently Added
          </button>
          <button
            onClick={() => onFiltersChange({
              ...filters,
              sortBy: 'rating',
              rating: 4.5,
            })}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              color: '#27ae60',
              border: '1px solid rgba(39, 174, 96, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(39, 174, 96, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ⭐ Highest Rated
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersPanel; 