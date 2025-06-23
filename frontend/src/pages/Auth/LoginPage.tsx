import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services';
import type { LoginRequest } from '../../services';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: ''
  });
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (showRegister) {
        // Register new admin
        const registerData = {
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name,
          password: formData.password
        };
        
        await authService.setupFirstAdmin(registerData);
      } else {
        // Login
        const loginData: LoginRequest = {
          email: formData.email,
          password: formData.password
        };
        
        await authService.login(loginData);
      }
      
      // Dispatch auth state change event
      window.dispatchEvent(new Event('authStateChanged'));
      
      // Redirect to main app
      navigate('/');
    } catch (err: any) {
      setError(err.message || `${showRegister ? 'Registration' : 'Login'} failed. Please check your information.`);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/logo-dpro-agent.png" 
            alt="Dpro Agent" 
            style={{ width: '80px', height: '80px', marginBottom: '1rem' }}
          />
          <h1 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
            {showRegister ? 'Create Admin Account' : 'Welcome Back'}
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '8px 0 0 0' }}>
            {showRegister ? 'Set up your admin account' : 'Sign in to your admin account'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your email"
            />
          </div>

          {showRegister && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Choose a username"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your full name"
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
            />
            {showRegister && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Password must be at least 8 characters long
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading 
              ? (showRegister ? 'Creating Account...' : 'Signing In...') 
              : (showRegister ? 'Create Admin Account' : 'Sign In')
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => {
              setShowRegister(!showRegister);
              setError(null);
              setFormData({ email: '', password: '', username: '', full_name: '' });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1976d2',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {showRegister 
              ? "Already have an account? Sign in" 
              : "Create new admin account"
            }
          </button>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          <strong>Admin Portal</strong><br/>
          {showRegister 
            ? "Create the first admin account for this system"
            : "Only system administrators can access this portal"
          }
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 