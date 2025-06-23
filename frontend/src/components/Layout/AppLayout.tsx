import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Import organized pages
import DashboardPage from '../../pages/Dashboard';
import AgentPage from '../../pages/Agent';
import BoardPage from '../../pages/Board';
import { ChatPage, ChildAgentChat } from '../../pages/Chat';
import SettingsPageNew from '../../pages/Settings/SettingsPageNew';
import TasksPage from '../../pages/Tasks';
import { ProfilePage } from '../../pages/Profile';
import LicensePage from '../../pages/License';

import { TopThreePage } from '../../pages/TopThree';
import { ThemesPage } from '../../pages/Themes';
import { ToolsPage } from '../../pages/Tools';
import { UpdatePage } from '../../pages/Update';
import { MarketplacePage } from '../../pages/Marketplace';

export function AppLayout() {
  const location = useLocation();
  const isBoardPage = location.pathname.includes('/board');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f8f8' }}>
      {!isBoardPage && <Sidebar />}
      
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        width: isBoardPage ? '100%' : 'auto',
        height: isBoardPage ? '100vh' : 'auto'
      }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agents" element={<AgentPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChildAgentChat />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/top-three" element={<TopThreePage />} />
          <Route path="/settings" element={<SettingsPageNew />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/updates" element={<UpdatePage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default AppLayout;
