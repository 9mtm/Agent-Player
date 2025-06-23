import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [systemStatus, setSystemStatus] = useState<'loading' | 'needs_admin' | 'ready'>('loading');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkSystemStatus();
    
    // Listen for authentication changes
    const handleAuthChange = () => {
      console.log('Auth change detected, rechecking authentication...');
      checkAuth();
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  const checkSystemStatus = async () => {
    try {
      console.log('Checking system status...');
      const status = await authService.checkSystemStatus();
      console.log('System status:', status);
      
      if (!status.admin_exists) {
        setSystemStatus('needs_admin');
        setLoading(false);
        // Redirect to admin setup if not already there
        if (location.pathname !== '/admin-setup') {
          navigate('/admin-setup');
        }
        return;
      }
      
      setSystemStatus('ready');
      // Now check authentication
      await checkAuth();
    } catch (err) {
      console.error('Failed to check system status:', err);
      setSystemStatus('needs_admin');
      setLoading(false);
      if (location.pathname !== '/admin-setup') {
        navigate('/admin-setup');
      }
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('No token found');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      console.log('Token found, validating with server...');
      const user = await authService.getCurrentUser();
      console.log('Authentication successful, user:', user);
      setIsAuthenticated(true);
      setLoading(false);
    } catch (err) {
      console.log('Authentication check failed:', err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
          <div>Loading Dpro Agent...</div>
        </div>
      </div>
    );
  }

  // If system needs admin setup, let the routing handle it
  if (systemStatus === 'needs_admin') {
    return <>{children}</>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated && location.pathname !== '/login') {
    navigate('/login');
    return null;
  }

  return <>{children}</>;
}

export default AuthWrapper; 