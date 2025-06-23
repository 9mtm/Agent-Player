import React from 'react';
import { brandIcons, systemIcons, statusIcons } from '../../../components/icons/IconRegistry';

export interface ServiceType {
  type: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  name: string;
}

// Enhanced service types with real brand icons using centralized registry
export const realBrandServices: ServiceType[] = [
  // Communication & Collaboration
  { type: 'slack', icon: brandIcons.slack.component, color: '#4A154B', name: 'Slack Message' },
  { type: 'discord', icon: brandIcons.discord.component, color: '#5865F2', name: 'Discord Message' },
  { type: 'telegram', icon: brandIcons.telegram.component, color: '#26A5E4', name: 'Telegram Bot' },
  { type: 'whatsapp', icon: brandIcons.whatsapp.component, color: '#25D366', name: 'WhatsApp Message' },
  
  // Project Management
  { type: 'trello', icon: brandIcons.trello.component, color: '#0052CC', name: 'Trello Card' },
  { type: 'asana', icon: brandIcons.asana.component, color: '#273347', name: 'Asana Task' },
  { type: 'notion', icon: brandIcons.notion.component, color: '#000000', name: 'Notion Page' },
  { type: 'linear', icon: brandIcons.linear.component, color: '#5E6AD2', name: 'Linear Issue' },
  
  // AI & Automation
  { type: 'openai', icon: brandIcons.openai.component, color: '#412991', name: 'OpenAI Request' },
  { type: 'ai-assistant', icon: systemIcons.robot.component, color: '#FF6B35', name: 'AI Assistant' },
  
  // Email & Calendar
  { type: 'gmail', icon: brandIcons.gmail.component, color: '#EA4335', name: 'Gmail Email' },
  { type: 'outlook', icon: systemIcons.email.component, color: '#0078D4', name: 'Outlook Email' },
  { type: 'calendar', icon: brandIcons.googleCalendar.component, color: '#4285F4', name: 'Google Calendar' },
  { type: 'email', icon: systemIcons.email.component, color: '#34495E', name: 'Email Service' },
  
  // Cloud & Storage
  { type: 'dropbox', icon: brandIcons.dropbox.component, color: '#0061FF', name: 'Dropbox File' },
  { type: 'google-drive', icon: brandIcons.google.component, color: '#4285F4', name: 'Google Drive' },
  { type: 'cloud', icon: systemIcons.cloud.component, color: '#3498DB', name: 'Cloud Storage' },
  
  // Development & Code
  { type: 'github', icon: brandIcons.github.component, color: '#181717', name: 'GitHub Action' },
  { type: 'code', icon: systemIcons.code.component, color: '#2ECC71', name: 'Code Execution' },
  
  // Social Media
  { type: 'x-twitter', icon: brandIcons.xTwitter.component, color: '#000000', name: 'X (Twitter) Post' },
  { type: 'facebook', icon: brandIcons.facebook.component, color: '#1877F2', name: 'Facebook Post' },
  { type: 'linkedin', icon: brandIcons.linkedin.component, color: '#0A66C2', name: 'LinkedIn Update' },
  { type: 'instagram', icon: brandIcons.instagram.component, color: '#E4405F', name: 'Instagram Post' },
  { type: 'youtube', icon: brandIcons.youtube.component, color: '#FF0000', name: 'YouTube Video' },
  
  // Entertainment & Media
  { type: 'spotify', icon: brandIcons.spotify.component, color: '#1DB954', name: 'Spotify Playlist' },
  { type: 'netflix', icon: brandIcons.netflix.component, color: '#E50914', name: 'Netflix Content' },
  
  // E-commerce & Business
  { type: 'amazon', icon: brandIcons.amazon.component, color: '#FF9900', name: 'Amazon AWS' },
  { type: 'shopping', icon: systemIcons.shopping.component, color: '#E67E22', name: 'Shopping Cart' },
  { type: 'payment', icon: systemIcons.payment.component, color: '#27AE60', name: 'Payment Processing' },
  
  // Tech Giants
  { type: 'apple', icon: brandIcons.apple.component, color: '#000000', name: 'Apple Service' },
  { type: 'google', icon: brandIcons.google.component, color: '#4285F4', name: 'Google API' },
  { type: 'microsoft', icon: systemIcons.windows.component, color: '#00BCF2', name: 'Microsoft 365' },
  { type: 'meta', icon: brandIcons.meta.component, color: '#1877F2', name: 'Meta Platform' },
  { type: 'adobe', icon: brandIcons.adobe.component, color: '#FF0000', name: 'Adobe Creative' },
  
  // System & Operations
  { type: 'webhook', icon: systemIcons.webhook.component, color: '#8e44ad', name: 'Webhook Trigger' },
  { type: 'database', icon: systemIcons.database.component, color: '#00bcd4', name: 'Database Query' },
  { type: 'server', icon: systemIcons.server.component, color: '#7F8C8D', name: 'Server Action' },
  { type: 'security', icon: systemIcons.lock.component, color: '#C0392B', name: 'Security Check' },
  
  // Analytics & Reports
  { type: 'analytics', icon: systemIcons.analytics.component, color: '#9B59B6', name: 'Analytics Data' },
  { type: 'reports', icon: systemIcons.reports.component, color: '#F39C12', name: 'Report Generation' },
  
  // User Interaction
  { type: 'question', icon: statusIcons.question.component, color: '#FF9800', name: 'Yes/No Question' },
  { type: 'success', icon: statusIcons.success.component, color: '#4CAF50', name: 'Success Response' },
  { type: 'error', icon: statusIcons.error.component, color: '#F44336', name: 'Error Handler' },
  { type: 'warning', icon: statusIcons.warning.component, color: '#FF9800', name: 'Warning Alert' },
  { type: 'info', icon: statusIcons.info.component, color: '#2196F3', name: 'Information' },
  
  // Device & Platform
  { type: 'mobile', icon: systemIcons.mobile.component, color: '#16A085', name: 'Mobile App' },
  { type: 'desktop', icon: systemIcons.desktop.component, color: '#2C3E50', name: 'Desktop App' },
  { type: 'web', icon: systemIcons.web.component, color: '#3498DB', name: 'Web Service' }
];

// Helper function to get random service type
export const getRandomServiceType = (): ServiceType => {
  return realBrandServices[Math.floor(Math.random() * realBrandServices.length)];
};

// Helper function to get service by type
export const getServiceByType = (type: string): ServiceType | undefined => {
  return realBrandServices.find(service => service.type === type);
};

// Brand Icon Component with fallback
interface BrandIconProps {
  serviceType: ServiceType;
  size?: number;
  color?: string;
}

export const BrandIcon: React.FC<BrandIconProps> = ({ 
  serviceType, 
  size = 16, 
  color 
}) => {
  const IconComponent = serviceType.icon;
  
  return (
    <IconComponent 
      style={{ 
        color: color || 'white', 
        fontSize: `${size}px`
      }}
    />
  );
}; 