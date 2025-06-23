import React, { useState } from 'react';
import { authService } from '../../services/auth';
import type { LoginRequest, RegisterRequest } from '../../services/auth';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: 'admin@dpro-agent.com',
    password: 'demo123456',
    username: '',
    full_name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('🔐 Form submitted:', { 
      isLogin, 
      email: formData.email,
      passwordLength: formData.password.length 
    });

    try {
      if (isLogin) {
        // Login
        const loginData: LoginRequest = {
          email: formData.email,
          password: formData.password
        };
        console.log('🚀 Attempting login...');
        const result = await authService.login(loginData);
        console.log('✅ Login successful, calling callback...', { 
          hasToken: !!result.access_token,
          userId: result.user.id 
        });
      } else {
        // Register
        const registerData: RegisterRequest = {
          email: formData.email,
          password: formData.password,
          username: formData.username || undefined,
          full_name: formData.full_name || undefined
        };
        console.log('🚀 Attempting registration...');
        const result = await authService.register(registerData);
        console.log('✅ Registration successful, calling callback...', { 
          hasToken: !!result.access_token,
          userId: result.user.id 
        });
      }
      
      // Call success callback to update AuthWrapper state
      onLoginSuccess();
    } catch (err: unknown) {
      console.error('❌ Auth error:', err);
      
      let errorMessage = `${isLogin ? 'Login' : 'Registration'} failed`;
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'response' in err) {
        const errorResponse = err as { response?: { data?: { detail?: string } } };
        errorMessage = errorResponse.response?.data?.detail || errorMessage;
      }
      
      setError(errorMessage);
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
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: '#1976d2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            fontSize: '2rem'
          }}>
            🤖
          </div>
          <h1 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '8px 0 0 0' }}>
            {isLogin ? 'Sign in to your account' : 'Join Dpro AI Agent platform'}
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

          {!isLogin && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                  Username (Optional)
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
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
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
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
            {!isLogin && (
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
              ? (isLogin ? 'Signing In...' : 'Creating Account...') 
              : (isLogin ? 'Sign In' : 'Create Account')
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setFormData({ email: 'admin@dpro-agent.com', password: 'demo123456', username: '', full_name: '' });
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
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>

        {/* Demo credentials */}
        <div style={{
          marginTop: '1.5rem',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Quick Test:</strong><br/>
          Use these demo credentials:<br/>
          Email: admin@dpro-agent.com<br/>
          Password: demo123456
          <br/>
          <button
            type="button"
            onClick={() => setFormData({
              email: 'admin@dpro-agent.com',
              password: 'demo123456',
              username: '',
              full_name: ''
            })}
            style={{
              marginTop: '8px',
              padding: '4px 12px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            🔑 Use Demo Credentials
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 