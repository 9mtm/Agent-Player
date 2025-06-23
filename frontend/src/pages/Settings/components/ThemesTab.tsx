import React from 'react';
import type { Theme } from '../types';

interface ThemesTabProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemesTab: React.FC<ThemesTabProps> = ({ theme, setTheme }) => {
  return (
    <div style={{ padding: '24px 0', maxWidth: 520 }}>
      <h3>Theme Settings</h3>
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ fontWeight: 500, marginRight: 12 }}>Theme:</label>
        <button
          style={{
            background: theme === 'dark' ? '#111' : '#fff',
            color: theme === 'dark' ? '#fff' : '#111',
            border: theme === 'dark' ? 'none' : '1px solid #111',
            borderRadius: 8,
            padding: '0.5rem 1.2rem',
            fontWeight: 600,
            marginRight: 8,
            cursor: 'pointer',
            opacity: theme === 'dark' ? 1 : 0.7,
          }}
          onClick={() => setTheme('dark')}
        >
          Dark
        </button>
        <button
          style={{
            background: theme === 'light' ? '#fff' : '#111',
            color: theme === 'light' ? '#111' : '#fff',
            border: theme === 'light' ? '1px solid #111' : 'none',
            borderRadius: 8,
            padding: '0.5rem 1.2rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: theme === 'light' ? 1 : 0.7,
          }}
          onClick={() => setTheme('light')}
        >
          Light
        </button>
      </div>
    </div>
  );
};

export default ThemesTab; 