import React, { useState } from 'react';
import MarketplaceHeader from './components/MarketplaceHeader';
import CategoryTabs from './components/CategoryTabs';
import ProductGrid from './components/ProductGrid';
import FeaturedSection from './components/FeaturedSection';
import FiltersPanel from './components/FiltersPanel';
import ProductModal from './components/ProductModal';
import type { MarketplaceProduct, ProductCategory, FilterOptions } from './types';

const MarketplacePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    pricing: 'all',
    rating: 0,
    compatibility: 'all',
    sortBy: 'popularity',
  });
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Sample marketplace data - will come from API in production
  const products: MarketplaceProduct[] = [
    // Extensions
    {
      id: '1',
      name: 'Slack Integration Hub',
      category: 'extensions',
      description: 'Complete Slack integration with advanced automation features',
      longDescription: 'Transform your AI agents into powerful Slack collaborators with real-time messaging, file sharing, and workflow automation.',
      price: 29.99,
      rating: 4.8,
      downloads: 12500,
      developer: 'TeamFlow Solutions',
      version: '2.1.4',
      compatibility: ['v2.0+'],
      tags: ['slack', 'messaging', 'automation', 'collaboration'],
      icon: '💬',
      images: ['/images/slack-hub-1.jpg', '/images/slack-hub-2.jpg'],
      features: ['Real-time messaging', 'File sharing', 'Workflow automation', 'Custom commands'],
      requirements: ['Node.js 16+', 'Slack API Token'],
      changelog: '2.1.4: Added new automation features',
      isPaid: true,
      isFeatured: true,
      installCount: 12500,
      lastUpdated: '2024-01-15',
    },
    {
      id: '2', 
      name: 'Trello Board Manager',
      category: 'extensions',
      description: 'Seamlessly manage Trello boards and cards through AI agents',
      longDescription: 'Enable your AI agents to create, update, and manage Trello boards with intelligent card organization and automated workflows.',
      price: 0,
      rating: 4.6,
      downloads: 8900,
      developer: 'ProductivityPro',
      version: '1.8.2',
      compatibility: ['v1.5+'],
      tags: ['trello', 'project-management', 'automation', 'boards'],
      icon: '📋',
      images: ['/images/trello-manager-1.jpg'],
      features: ['Board creation', 'Card management', 'Label automation', 'Due date tracking'],
      requirements: ['Trello API Key'],
      changelog: '1.8.2: Improved card synchronization',
      isPaid: false,
      isFeatured: true,
      installCount: 8900,
      lastUpdated: '2024-01-12',
    },
    {
      id: '3',
      name: 'GitHub Integration Suite',
      category: 'extensions',
      description: 'Complete GitHub integration for repository management and CI/CD',
      longDescription: 'Connect your AI agents to GitHub for automated pull requests, issue management, and continuous integration workflows.',
      price: 49.99,
      rating: 4.9,
      downloads: 15600,
      developer: 'DevOps Masters',
      version: '3.2.1',
      compatibility: ['v2.0+'],
      tags: ['github', 'git', 'ci-cd', 'automation', 'repositories'],
      icon: '🐙',
      images: ['/images/github-suite-1.jpg', '/images/github-suite-2.jpg'],
      features: ['PR automation', 'Issue management', 'CI/CD integration', 'Code analysis'],
      requirements: ['GitHub API Token', 'Git installed'],
      changelog: '3.2.1: Enhanced security features',
      isPaid: true,
      isFeatured: true,
      installCount: 15600,
      lastUpdated: '2024-01-18',
    },

    // Themes
    {
      id: '4',
      name: 'Dark Matrix Theme',
      category: 'themes',
      description: 'Futuristic dark theme with matrix-inspired animations',
      longDescription: 'Transform your interface into a cyberpunk experience with animated backgrounds, neon highlights, and smooth transitions.',
      price: 9.99,
      rating: 4.7,
      downloads: 25000,
      developer: 'CyberDesign Studio',
      version: '1.5.0',
      compatibility: ['v2.0+'],
      tags: ['dark', 'cyberpunk', 'animations', 'neon'],
      icon: '🌃',
      images: ['/images/dark-matrix-1.jpg', '/images/dark-matrix-2.jpg'],
      features: ['Animated backgrounds', 'Neon accents', 'Custom icons', 'Sound effects'],
      requirements: ['Modern browser with CSS3 support'],
      changelog: '1.5.0: Added new animation effects',
      isPaid: true,
      isFeatured: true,
      installCount: 25000,
      lastUpdated: '2024-01-10',
    },
    {
      id: '5',
      name: 'Minimalist White',
      category: 'themes',
      description: 'Clean, minimal white theme for productivity focus',
      longDescription: 'A distraction-free theme designed for maximum productivity with clean lines and excellent readability.',
      price: 0,
      rating: 4.5,
      downloads: 18000,
      developer: 'MinimalUI',
      version: '2.0.3',
      compatibility: ['v1.0+'],
      tags: ['minimal', 'clean', 'white', 'productivity'],
      icon: '⚪',
      images: ['/images/minimal-white-1.jpg'],
      features: ['Clean interface', 'High contrast', 'Customizable spacing', 'Dark mode toggle'],
      requirements: ['Any modern browser'],
      changelog: '2.0.3: Improved accessibility',
      isPaid: false,
      isFeatured: false,
      installCount: 18000,
      lastUpdated: '2024-01-05',
    },

    // AI Agents
    {
      id: '6',
      name: 'Advanced Analytics Agent',
      category: 'agents',
      description: 'Powerful AI agent for data analysis and business intelligence',
      longDescription: 'Sophisticated analytics agent that processes complex datasets and generates actionable business insights with machine learning.',
      price: 99.99,
      rating: 4.9,
      downloads: 3200,
      developer: 'DataMind AI',
      version: '4.1.0',
      compatibility: ['v2.5+'],
      tags: ['analytics', 'ai', 'business-intelligence', 'machine-learning'],
      icon: '📊',
      images: ['/images/analytics-agent-1.jpg', '/images/analytics-agent-2.jpg'],
      features: ['Advanced ML algorithms', 'Real-time processing', 'Custom reports', 'API integration'],
      requirements: ['Python 3.8+', 'TensorFlow', '4GB RAM minimum'],
      changelog: '4.1.0: New deep learning models',
      isPaid: true,
      isFeatured: true,
      installCount: 3200,
      lastUpdated: '2024-01-20',
    },
    {
      id: '7',
      name: 'Customer Support Bot',
      category: 'agents',
      description: 'Intelligent customer support agent with multilingual capabilities',
      longDescription: 'AI-powered customer support agent that handles inquiries in 25+ languages with sentiment analysis and escalation protocols.',
      price: 39.99,
      rating: 4.6,
      downloads: 7800,
      developer: 'SupportAI Corp',
      version: '2.8.5',
      compatibility: ['v2.0+'],
      tags: ['customer-support', 'multilingual', 'chatbot', 'sentiment-analysis'],
      icon: '🎧',
      images: ['/images/support-bot-1.jpg'],
      features: ['25+ languages', 'Sentiment analysis', 'Auto-escalation', 'Knowledge base'],
      requirements: ['OpenAI API Key', '2GB RAM minimum'],
      changelog: '2.8.5: Improved language processing',
      isPaid: true,
      isFeatured: false,
      installCount: 7800,
      lastUpdated: '2024-01-14',
    },

    // MCP Servers
    {
      id: '8',
      name: 'Universal MCP Bridge',
      category: 'mcp-servers',
      description: 'Connect to 50+ platforms through unified MCP protocol',
      longDescription: 'Revolutionary MCP server that provides unified access to major platforms including Google Workspace, Microsoft 365, Salesforce, and more.',
      price: 79.99,
      rating: 4.8,
      downloads: 5400,
      developer: 'ConnectAll Systems',
      version: '1.3.7',
      compatibility: ['v2.0+'],
      tags: ['mcp', 'integration', 'universal', 'platforms'],
      icon: '🌐',
      images: ['/images/mcp-bridge-1.jpg', '/images/mcp-bridge-2.jpg'],
      features: ['50+ platform support', 'Real-time sync', 'Secure authentication', 'Rate limiting'],
      requirements: ['Docker', 'SSL Certificate', '512MB RAM'],
      changelog: '1.3.7: Added Notion and Airtable support',
      isPaid: true,
      isFeatured: true,
      installCount: 5400,
      lastUpdated: '2024-01-16',
    },
    {
      id: '9',
      name: 'Database MCP Server',
      category: 'mcp-servers',
      description: 'Connect to any database through MCP protocol',
      longDescription: 'Powerful MCP server for database connectivity supporting MySQL, PostgreSQL, MongoDB, Redis, and more with query optimization.',
      price: 0,
      rating: 4.4,
      downloads: 9200,
      developer: 'DataBridge Open Source',
      version: '2.1.8',
      compatibility: ['v1.8+'],
      tags: ['database', 'mysql', 'postgresql', 'mongodb', 'redis'],
      icon: '🗄️',
      images: ['/images/db-mcp-1.jpg'],
      features: ['Multi-database support', 'Query optimization', 'Connection pooling', 'Security'],
      requirements: ['Database drivers', '1GB RAM'],
      changelog: '2.1.8: Performance improvements',
      isPaid: false,
      isFeatured: false,
      installCount: 9200,
      lastUpdated: '2024-01-08',
    },
  ];

  const filteredProducts = products.filter(product => {
    // Category filter
    if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
    
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !product.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    
    // Pricing filter
    if (filters.pricing === 'free' && product.isPaid) return false;
    if (filters.pricing === 'paid' && !product.isPaid) return false;
    
    // Rating filter
    if (filters.rating > 0 && product.rating < filters.rating) return false;
    
    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (filters.sortBy) {
      case 'popularity':
        return b.downloads - a.downloads;
      case 'rating':
        return b.rating - a.rating;
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'newest':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      default:
        return 0;
    }
  });

  const featuredProducts = products.filter(p => p.isFeatured);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <MarketplaceHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFiltersToggle={() => setIsFiltersOpen(!isFiltersOpen)}
      />

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Featured Section */}
        <FeaturedSection products={featuredProducts} onProductClick={setSelectedProduct} />

        {/* Categories and Filters */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '40px' }}>
          
          {/* Filters Sidebar */}
          {isFiltersOpen && (
            <div style={{ width: '280px', flexShrink: 0 }}>
              <FiltersPanel 
                filters={filters}
                onFiltersChange={setFilters}
                productCount={sortedProducts.length}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div style={{ flex: 1 }}>
            
            {/* Category Tabs */}
            <CategoryTabs 
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              productCounts={{
                all: products.length,
                extensions: products.filter(p => p.category === 'extensions').length,
                themes: products.filter(p => p.category === 'themes').length,
                agents: products.filter(p => p.category === 'agents').length,
                'mcp-servers': products.filter(p => p.category === 'mcp-servers').length,
              }}
            />

            {/* Results Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingTop: '20px',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                {sortedProducts.length} {selectedCategory === 'all' ? 'products' : selectedCategory} found
                {searchQuery && <span style={{ color: '#7f8c8d' }}> for "{searchQuery}"</span>}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#7f8c8d' }}>Sort by:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e1e5e9',
                    background: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="popularity">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <ProductGrid 
              products={sortedProducts}
              onProductClick={setSelectedProduct}
            />

            {/* Empty State */}
            {sortedProducts.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#7f8c8d',
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                  No products found
                </h3>
                <p style={{ fontSize: '16px', marginBottom: '24px' }}>
                  Try adjusting your search or filters to find what you're looking for.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({
                      pricing: 'all',
                      rating: 0,
                      compatibility: 'all',
                      sortBy: 'popularity',
                    });
                    setSelectedCategory('all');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default MarketplacePage; 