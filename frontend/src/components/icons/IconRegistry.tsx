// 🎯 Centralized Icon Registry - All icons organized in one place
// This file maintains all icon imports and exports for the entire project

import React from 'react';

// Simple Icons (Brand Icons)
import { 
  SiSlack, 
  SiTrello, 
  SiOpenai, 
  SiGmail,
  SiGooglecalendar,
  SiNotion,
  SiLinear,
  SiAsana,
  SiDropbox,
  SiGithub,
  SiDiscord,
  SiTelegram,
  SiWhatsapp,
  SiFacebook,
  SiLinkedin,
  SiInstagram,
  SiYoutube,
  SiSpotify,
  SiNetflix,
  SiAmazon,
  SiApple,
  SiGoogle,
  SiMeta,
  SiAdobe,
  SiX
} from 'react-icons/si';

// FontAwesome Icons (System & UI Icons)
import { 
  // System & Database
  FaQuestionCircle, 
  FaDatabase, 
  FaBolt, 
  FaWindows,
  FaEnvelope,
  FaRobot,
  FaCloud,
  FaCode,
  FaChartBar,
  FaFileAlt,
  FaMobile,
  FaDesktop,
  FaServer,
  FaLock,
  FaShoppingCart,
  FaCreditCard,
  FaGlobe,
  
  // Status & Feedback Icons
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCog,
  FaCheck,
  FaTimes,
  FaExclamation,
  
  // UI & Navigation
  FaPlay,
  FaStop,
  FaPause,
  FaRedo,
  FaUndo,
  FaSearch,
  FaFilter,
  FaSort,
  FaArrowUp,
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  
  // Files & Documents
  FaFile,
  FaFolder,
  FaUpload,
  FaDownload,
  FaFileExport,
  FaFileImport,
  
  // Effects & Animations
  FaMagic,
  FaStar
} from 'react-icons/fa';

// Icon Type Definition
export interface IconComponent {
  component: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  name: string;
  category: 'brand' | 'system' | 'status' | 'ui' | 'workflow' | 'communication' | 'files' | 'settings' | 'time' | 'security' | 'media' | 'effects';
}

// 🎨 Brand Icons Registry
export const brandIcons: Record<string, IconComponent> = {
  // Communication Platforms
  slack: { component: SiSlack, name: 'Slack', category: 'brand' },
  discord: { component: SiDiscord, name: 'Discord', category: 'brand' },
  telegram: { component: SiTelegram, name: 'Telegram', category: 'brand' },
  whatsapp: { component: SiWhatsapp, name: 'WhatsApp', category: 'brand' },
  
  // Project Management
  trello: { component: SiTrello, name: 'Trello', category: 'brand' },
  asana: { component: SiAsana, name: 'Asana', category: 'brand' },
  notion: { component: SiNotion, name: 'Notion', category: 'brand' },
  linear: { component: SiLinear, name: 'Linear', category: 'brand' },
  
  // AI & Development
  openai: { component: SiOpenai, name: 'OpenAI', category: 'brand' },
  github: { component: SiGithub, name: 'GitHub', category: 'brand' },
  
  // Google Services
  gmail: { component: SiGmail, name: 'Gmail', category: 'brand' },
  googleCalendar: { component: SiGooglecalendar, name: 'Google Calendar', category: 'brand' },
  google: { component: SiGoogle, name: 'Google', category: 'brand' },
  
  // Cloud & Storage
  dropbox: { component: SiDropbox, name: 'Dropbox', category: 'brand' },
  
  // Social Media
  xTwitter: { component: SiX, name: 'X (Twitter)', category: 'brand' },
  facebook: { component: SiFacebook, name: 'Facebook', category: 'brand' },
  linkedin: { component: SiLinkedin, name: 'LinkedIn', category: 'brand' },
  instagram: { component: SiInstagram, name: 'Instagram', category: 'brand' },
  youtube: { component: SiYoutube, name: 'YouTube', category: 'brand' },
  
  // Entertainment
  spotify: { component: SiSpotify, name: 'Spotify', category: 'brand' },
  netflix: { component: SiNetflix, name: 'Netflix', category: 'brand' },
  
  // Tech Giants
  amazon: { component: SiAmazon, name: 'Amazon', category: 'brand' },
  apple: { component: SiApple, name: 'Apple', category: 'brand' },
  meta: { component: SiMeta, name: 'Meta', category: 'brand' },
  adobe: { component: SiAdobe, name: 'Adobe', category: 'brand' }
};

// ⚙️ System Icons Registry
export const systemIcons: Record<string, IconComponent> = {
  // Core System
  database: { component: FaDatabase, name: 'Database', category: 'system' },
  server: { component: FaServer, name: 'Server', category: 'system' },
  cloud: { component: FaCloud, name: 'Cloud', category: 'system' },
  webhook: { component: FaBolt, name: 'Webhook', category: 'system' },
  
  // Platforms
  windows: { component: FaWindows, name: 'Windows', category: 'system' },
  mobile: { component: FaMobile, name: 'Mobile', category: 'system' },
  desktop: { component: FaDesktop, name: 'Desktop', category: 'system' },
  web: { component: FaGlobe, name: 'Web', category: 'system' },
  
  // Development
  code: { component: FaCode, name: 'Code', category: 'system' },
  robot: { component: FaRobot, name: 'AI/Robot', category: 'system' },
  
  // Business
  email: { component: FaEnvelope, name: 'Email', category: 'system' },
  shopping: { component: FaShoppingCart, name: 'Shopping', category: 'system' },
  payment: { component: FaCreditCard, name: 'Payment', category: 'system' },
  analytics: { component: FaChartBar, name: 'Analytics', category: 'system' },
  reports: { component: FaFileAlt, name: 'Reports', category: 'system' },
  
  // Security
  lock: { component: FaLock, name: 'Security Lock', category: 'system' }
};

// ✅ Status Icons Registry
export const statusIcons: Record<string, IconComponent> = {
  // Success States
  success: { component: FaCheckCircle, name: 'Success', category: 'status' },
  check: { component: FaCheck, name: 'Check', category: 'status' },
  
  // Error States
  error: { component: FaTimesCircle, name: 'Error', category: 'status' },
  times: { component: FaTimes, name: 'Close/Times', category: 'status' },
  
  // Warning States
  warning: { component: FaExclamationTriangle, name: 'Warning', category: 'status' },
  exclamation: { component: FaExclamation, name: 'Exclamation', category: 'status' },
  
  // Info States
  info: { component: FaInfoCircle, name: 'Information', category: 'status' },
  question: { component: FaQuestionCircle, name: 'Question', category: 'status' },
  
  // Processing States
  processing: { component: FaCog, name: 'Processing', category: 'status' }
};

// 🎛️ UI Icons Registry
export const uiIcons: Record<string, IconComponent> = {
  // Media Controls
  play: { component: FaPlay, name: 'Play', category: 'ui' },
  stop: { component: FaStop, name: 'Stop', category: 'ui' },
  pause: { component: FaPause, name: 'Pause', category: 'ui' },
  
  // Navigation
  undo: { component: FaUndo, name: 'Undo', category: 'ui' },
  redo: { component: FaRedo, name: 'Redo', category: 'ui' },
  
  // Arrows
  arrowUp: { component: FaArrowUp, name: 'Arrow Up', category: 'ui' },
  arrowDown: { component: FaArrowDown, name: 'Arrow Down', category: 'ui' },
  arrowLeft: { component: FaArrowLeft, name: 'Arrow Left', category: 'ui' },
  arrowRight: { component: FaArrowRight, name: 'Arrow Right', category: 'ui' },
  
  // Tools
  search: { component: FaSearch, name: 'Search', category: 'ui' },
  filter: { component: FaFilter, name: 'Filter', category: 'ui' },
  sort: { component: FaSort, name: 'Sort', category: 'ui' },
  
  // Effects
  magic: { component: FaMagic, name: 'Magic', category: 'effects' },
  star: { component: FaStar, name: 'Star', category: 'effects' }
};

// 📁 File Icons Registry
export const fileIcons: Record<string, IconComponent> = {
  file: { component: FaFile, name: 'File', category: 'files' },
  folder: { component: FaFolder, name: 'Folder', category: 'files' },
  upload: { component: FaUpload, name: 'Upload', category: 'files' },
  download: { component: FaDownload, name: 'Download', category: 'files' },
  export: { component: FaFileExport, name: 'Export', category: 'files' },
  import: { component: FaFileImport, name: 'Import', category: 'files' }
};

// ⚡ Complete Icon Registry (All Icons Combined)
export const iconRegistry = {
  ...brandIcons,
  ...systemIcons,
  ...statusIcons,
  ...uiIcons,
  ...fileIcons
};

// 🔍 Helper Functions
export const getIconByName = (name: string): IconComponent | undefined => {
  return iconRegistry[name];
};

export const getIconsByCategory = (category: IconComponent['category']): Record<string, IconComponent> => {
  return Object.fromEntries(
    Object.entries(iconRegistry).filter(([, icon]) => icon.category === category)
  );
};

export const getAllIconNames = (): string[] => {
  return Object.keys(iconRegistry);
};

export const getAllCategories = (): IconComponent['category'][] => {
  const categories = new Set(Object.values(iconRegistry).map(icon => icon.category));
  return Array.from(categories);
};

// 🎨 Icon Component Wrapper
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 16, 
  color, 
  className, 
  title 
}) => {
  const iconData = getIconByName(name);
  
  if (!iconData) {
    console.warn(`Icon "${name}" not found in registry`);
    return <FaQuestionCircle style={{ fontSize: size, color: color || '#999' }} />;
  }
  
  const IconComponent = iconData.component;
  
  return (
    <span title={title || iconData.name}>
      <IconComponent 
        style={{ 
          fontSize: `${size}px`, 
          color: color || 'currentColor' 
        }}
        className={className}
      />
    </span>
  );
};

// Export default registry for easy access
export default iconRegistry; 