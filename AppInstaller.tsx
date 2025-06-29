import React, { useState, useEffect } from 'react';
import manifest from './app.manifest.json';

interface AppInstallerProps {
  onInstallComplete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export const AppInstaller: React.FC<AppInstallerProps> = ({
  onInstallComplete,
  onActivate,
  onDeactivate
}) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  useEffect(() => {
    // Check if app is already installed
    checkInstallationStatus();
  }, []);

  const checkInstallationStatus = async () => {
    try {
      // Check with backend if app is installed
      const response = await fetch(`/api/marketplace/apps/${manifest.id}/status`);
      const data = await response.json();
      setIsInstalled(data.installed);
      setIsActive(data.active);
    } catch (error) {
      console.error('Failed to check installation status:', error);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setInstallProgress(0);

    try {
      // Step 1: Download app (20%)
      setInstallProgress(20);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Create database tables (40%)
      setInstallProgress(40);
      const migrationResponse = await fetch(`/api/marketplace/apps/${manifest.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrations: manifest.installation.databaseMigrations })
      });

      if (!migrationResponse.ok) {
        throw new Error('Database migration failed');
      }

      // Step 3: Install dependencies (60%)
      setInstallProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Configure permissions (80%)
      setInstallProgress(80);
      const permissionsResponse = await fetch(`/api/marketplace/apps/${manifest.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: manifest.permissions })
      });

      if (!permissionsResponse.ok) {
        throw new Error('Permissions setup failed');
      }

      // Step 5: Complete installation (100%)
      setInstallProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsInstalled(true);
      setIsActive(true);
      onInstallComplete?.();
      
    } catch (error) {
      console.error('Installation failed:', error);
      alert('Installation failed. Please try again.');
    } finally {
      setInstalling(false);
      setInstallProgress(0);
    }
  };

  const handleActivate = async () => {
    try {
      const response = await fetch(`/api/marketplace/apps/${manifest.id}/activate`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsActive(true);
        onActivate?.();
      }
    } catch (error) {
      console.error('Activation failed:', error);
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await fetch(`/api/marketplace/apps/${manifest.id}/deactivate`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsActive(false);
        onDeactivate?.();
      }
    } catch (error) {
      console.error('Deactivation failed:', error);
    }
  };

  const handleUninstall = async () => {
    if (!confirm('Are you sure you want to uninstall this app? This will remove all custom fields and data.')) {
      return;
    }

    try {
      const response = await fetch(`/api/marketplace/apps/${manifest.id}/uninstall`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setIsInstalled(false);
        setIsActive(false);
        alert('App uninstalled successfully');
      }
    } catch (error) {
      console.error('Uninstall failed:', error);
    }
  };

  if (installing) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h3 className="text-lg font-semibold mb-4">Installing {manifest.displayName}</h3>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${installProgress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-600">
            {installProgress < 20 && 'Downloading app...'}
            {installProgress >= 20 && installProgress < 40 && 'Creating database tables...'}
            {installProgress >= 40 && installProgress < 60 && 'Installing dependencies...'}
            {installProgress >= 60 && installProgress < 80 && 'Configuring permissions...'}
            {installProgress >= 80 && 'Completing installation...'}
          </p>
          
          <div className="text-xs text-gray-500 mt-2">
            {installProgress}% complete
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* App Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="text-3xl mb-2">🔧</div>
        <h2 className="text-xl font-bold">{manifest.displayName}</h2>
        <p className="text-blue-100 text-sm mt-1">v{manifest.version}</p>
      </div>

      {/* App Info */}
      <div className="p-6">
        <p className="text-gray-600 mb-4">{manifest.description}</p>
        
        {/* Features */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Features:</h4>
          <div className="space-y-2">
            {manifest.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center text-sm">
                <span className="mr-2">{feature.icon}</span>
                <span>{feature.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="mb-6 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-green-800">
              {manifest.price.type === 'freemium' ? 'Freemium' : 'Paid'}
            </span>
            <span className="text-xl font-bold text-green-800">
              ${manifest.price.cost}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Free tier available • Premium features unlock
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isInstalled ? (
            <button
              onClick={handleInstall}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Install App
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex space-x-2">
                {isActive ? (
                  <button
                    onClick={handleDeactivate}
                    className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={handleActivate}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Activate
                  </button>
                )}
                
                <button
                  onClick={handleUninstall}
                  className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Uninstall
                </button>
              </div>
              
              {isActive && (
                <div className="text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Active & Ready
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Status: {isInstalled ? (isActive ? 'Active' : 'Installed but Inactive') : 'Not Installed'}
        </div>
      </div>
    </div>
  );
};

export default AppInstaller; 