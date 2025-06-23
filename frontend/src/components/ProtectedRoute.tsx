import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, authService } from '../services';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }

    try {
      // Verify token is still valid
      const user = await authService.getCurrentUser();
      if (user) {
        setAuthenticated(true);
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error: any) {
      // Token invalid or expired
      console.log('ProtectedRoute: Auth verification failed:', error.response?.status);
      
      // Only clear auth if it's actually a 401 error
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setAuthenticated(false);
      } else {
        // For other errors (network, etc.), keep the user logged in
        setAuthenticated(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 