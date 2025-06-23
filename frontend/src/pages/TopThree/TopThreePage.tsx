import React from 'react';
import { useTopThree } from './hooks/useTopThree';
import type { CategoryType, TopItem } from './types';

const TopThreePage: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    categories,
    currentData,
    getRankIcon,
    getTrendColor,
    getPerformanceMetrics,
  } = useTopThree();

  const metrics = getPerformanceMetrics();

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: 'var(--background-color)',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: 'var(--text-primary)',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '16px',
      color: 'var(--text-secondary)',
      marginBottom: '24px',
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '32px',
    },
    metricCard: {
      backgroundColor: 'var(--card-background)',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      textAlign: 'center' as const,
    },
    metricValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '4px',
    },
    metricLabel: {
      fontSize: '14px',
      color: 'var(--text-secondary)',
    },
    categoryTabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      borderBottom: '1px solid var(--border-color)',
      paddingBottom: '16px',
    },
    categoryTab: {
      padding: '12px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
    },
    categoryTabActive: {
      backgroundColor: 'var(--primary-color)',
      color: 'white',
    },
    topItemsGrid: {
      display: 'grid',
      gap: '16px',
    },
    topItem: {
      backgroundColor: 'var(--card-background)',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      display: 'grid',
      gridTemplateColumns: '60px 1fr auto',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.2s ease',
    },
    rankSection: {
      textAlign: 'center' as const,
    },
    rankIcon: {
      fontSize: '24px',
      marginBottom: '4px',
    },
    rankNumber: {
      fontSize: '12px',
      color: 'var(--text-secondary)',
      fontWeight: 'bold',
    },
    itemContent: {
      flex: 1,
    },
    itemName: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'var(--text-primary)',
      marginBottom: '4px',
    },
    itemDescription: {
      fontSize: '14px',
      color: 'var(--text-secondary)',
      marginBottom: '8px',
    },
    itemUsage: {
      fontSize: '12px',
      color: 'var(--text-tertiary)',
    },
    itemStats: {
      textAlign: 'right' as const,
    },
    itemScore: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '4px',
    },
    itemTrend: {
      fontSize: '14px',
      fontWeight: '500',
    },
  };

  const renderMetricCard = (label: string, value: string | number) => (
    <div style={styles.metricCard}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );

  const renderTopItem = (item: TopItem, index: number) => (
    <div key={item.id} style={styles.topItem}>
      <div style={styles.rankSection}>
        <div style={styles.rankIcon}>{getRankIcon(index + 1)}</div>
        <div style={styles.rankNumber}>#{index + 1}</div>
      </div>
      
      <div style={styles.itemContent}>
        <div style={styles.itemName}>{item.name}</div>
        <div style={styles.itemDescription}>{item.description}</div>
        <div style={styles.itemUsage}>{item.usage}</div>
      </div>
      
      <div style={styles.itemStats}>
        <div style={styles.itemScore}>{item.score}</div>
        <div 
          style={{
            ...styles.itemTrend,
            color: getTrendColor(item.trend)
          }}
        >
          {item.trend}
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏆 Top Performers</h1>
        <p style={styles.subtitle}>
          Discover the highest-performing agents, workflows, tasks, and users in your organization
        </p>
      </div>

      {/* Performance Metrics */}
      <div style={styles.metricsGrid}>
        {renderMetricCard('Average Score', metrics.averageScore)}
        {renderMetricCard('Growth Rate', metrics.growthRate)}
        {renderMetricCard('Total Items', metrics.totalItems)}
        {renderMetricCard('Availability', metrics.availability)}
      </div>

      {/* Category Tabs */}
      <div style={styles.categoryTabs}>
        {categories.map((category) => (
          <button
            key={category.id}
            style={{
              ...styles.categoryTab,
              ...(selectedCategory === category.id ? styles.categoryTabActive : {}),
            }}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.icon} {category.label}
          </button>
        ))}
      </div>

      {/* Top Items List */}
      <div style={styles.topItemsGrid}>
        {currentData.map((item, index) => renderTopItem(item, index))}
      </div>
    </div>
  );
};

export default TopThreePage; 