import { SIDEBAR_CONFIG, AGENT_STATUS_CONFIG } from './constants';
import type { Agent } from '../types';

// Page layout styles
export const pageContainerStyle = {
  display: 'flex',
  height: 'calc(100vh - 70px)'
} as const;

export const pageHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '1rem 1.5rem',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)'
} as const;

export const pageActionsStyle = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center'
} as const;

// Sidebar styles
export const sidebarStyle = (isOpen: boolean) => ({
  width: isOpen ? `${SIDEBAR_CONFIG.width}px` : '0px',
  backgroundColor: 'var(--bg-secondary)',
  borderRight: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
  transition: 'width 0.2s ease-in-out'
});

export const sidebarHeaderStyle = {
  padding: '1rem',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)'
} as const;

export const sidebarListStyle = {
  flex: 1,
  overflow: 'auto',
  padding: '0.5rem'
} as const;

export const sidebarFooterStyle = {
  padding: '1rem',
  borderTop: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)'
} as const;

// Agent item styles
export const agentItemStyle = (isSelected: boolean) => ({
  padding: '0.75rem',
  margin: '0.25rem',
  backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--bg-primary)',
  color: isSelected ? 'white' : 'var(--text-primary)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  border: '1px solid var(--border-color)',
  transition: 'all 0.15s ease-in-out'
});

export const agentItemHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.5rem'
} as const;

export const agentNameStyle = (isSelected: boolean) => ({
  margin: 0,
  fontSize: '0.875rem',
  fontWeight: '500',
  color: isSelected ? 'white' : 'var(--text-primary)'
});

export const agentMetaStyle = (isSelected: boolean) => ({
  fontSize: '0.75rem',
  color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
  marginBottom: '0.25rem'
});

// Status badge styles
export const statusBadgeStyle = (agent: Agent) => {
  const status = agent.is_active ? 'active' : 'inactive';
  const config = AGENT_STATUS_CONFIG[status];
  
  return {
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '1rem',
    color: config.color,
    backgroundColor: config.bgColor,
    border: `1px solid ${config.color}`
  };
};

// Main area styles
export const mainAreaStyle = {
  flex: 1,
  position: 'relative' as const,
  overflow: 'hidden'
} as const;

export const emptyStateStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--bg-secondary)',
  padding: '2rem'
} as const;

export const emptyStateIconStyle = {
  fontSize: '4rem',
  marginBottom: '1rem'
} as const;

export const emptyStateTitleStyle = {
  fontSize: '1.5rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
  color: 'var(--text-primary)'
} as const;

export const emptyStateDescriptionStyle = {
  maxWidth: '400px',
  textAlign: 'center' as const,
  color: 'var(--text-muted)',
  marginBottom: '1.5rem',
  lineHeight: 1.5
} as const;

export const emptyStateActionsStyle = {
  display: 'flex',
  gap: '1rem'
} as const;

// Quick actions toolbar styles
export const quickActionsStyle = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  display: 'flex',
  gap: '0.5rem',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius)',
  padding: '0.5rem',
  boxShadow: 'var(--shadow)',
  zIndex: 10
} as const;

export const addButtonStyle = {
  padding: '0.5rem 0.75rem',
  fontSize: '1.2rem',
  backgroundColor: 'var(--primary-color)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontWeight: 'bold'
} as const;

export const toolbarSeparatorStyle = {
  width: '1px',
  backgroundColor: 'var(--border-color)',
  margin: '0.25rem 0'
} as const;

export const toolbarButtonStyle = {
  padding: '0.5rem',
  fontSize: '0.875rem',
  backgroundColor: 'transparent',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  color: 'var(--text-primary)'
} as const;

// Agent actions styles
export const agentActionsStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.75rem'
} as const;

export const actionRowStyle = {
  display: 'flex',
  gap: '0.5rem'
} as const;

export const actionButtonStyle = (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => ({
  flex: 1,
  fontSize: '0.875rem',
  padding: '0.5rem',
  border: variant === 'primary' ? 'none' : '1px solid var(--border-color)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  backgroundColor: variant === 'danger' 
    ? 'var(--error-color)' 
    : variant === 'primary' 
    ? 'var(--primary-color)' 
    : 'transparent',
  color: variant === 'danger' || variant === 'primary' 
    ? 'white' 
    : 'var(--text-primary)'
});

// Loading styles
export const loadingContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: 'var(--bg-primary)'
} as const;

export const loadingTextStyle = {
  fontSize: '1rem',
  color: 'var(--text-muted)'
} as const;

// Error message styles
export const errorMessageStyle = {
  color: 'var(--error-color)',
  fontSize: '0.875rem',
  marginTop: '0.5rem',
  padding: '0.5rem',
  backgroundColor: 'var(--error-bg)',
  border: '1px solid var(--error-color)',
  borderRadius: 'var(--radius)'
} as const;

// Utility functions for dynamic styles
export const getAgentItemHoverStyle = (isSelected: boolean) => ({
  ...agentItemStyle(isSelected),
  backgroundColor: isSelected 
    ? 'var(--primary-color)' 
    : 'var(--bg-hover)',
  transform: 'translateY(-1px)',
  boxShadow: 'var(--shadow)'
});

export const getButtonHoverStyle = (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => ({
  ...actionButtonStyle(variant),
  opacity: 0.8,
  transform: 'translateY(-1px)'
});

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px'
} as const;

// Responsive sidebar
export const getResponsiveSidebarStyle = (isOpen: boolean, isMobile: boolean) => ({
  ...sidebarStyle(isOpen),
  position: isMobile ? 'absolute' as const : 'relative' as const,
  zIndex: isMobile ? 100 : 'auto',
  height: isMobile ? '100%' : 'auto'
});

// Animation styles
export const fadeInStyle = {
  animation: 'fadeIn 0.2s ease-in-out'
} as const;

export const slideInStyle = {
  animation: 'slideIn 0.3s ease-out'
} as const; 