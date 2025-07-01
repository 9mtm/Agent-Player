import React, { useState } from 'react';

const LicensePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('license');
  const [processing, setProcessing] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');

  const currentLicense = {
    type: 'free',
    status: 'active',
    features: [
      'Basic profile management',
      'Theme customization', 
      'Community marketplace access',
      'Standard support'
    ],
    maxUsers: 1,
    maxProjects: 3
  };

  const pricingPlans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 4.99,
      features: [
        'Advanced profile management',
        'Premium themes',
        'Priority support',
        'Basic analytics',
        'Email support'
      ],
      maxUsers: 1,
      maxProjects: 10,
      userTypes: ['freelancer']
    },
    {
      id: 'premium', 
      name: 'Premium Plan',
      price: 9.99,
      features: [
        'Full business features',
        'Team management',
        'Advanced analytics',
        'Custom branding',
        'API access',
        'Phone support'
      ],
      maxUsers: 5,
      maxProjects: 50,
      popular: true,
      userTypes: ['company', 'organization']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan', 
      price: 29.99,
      features: [
        'Unlimited everything',
        'Advanced security',
        'Custom integrations',
        'Dedicated support',
        'On-premise option',
        'SLA guarantee'
      ],
      maxUsers: 999,
      maxProjects: 999,
      userTypes: ['large company']
    }
  ];

  const handleUpgrade = async (planId: string) => {
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      alert(`Payment successful! ${planId.charAt(0).toUpperCase() + planId.slice(1)} license activated ✅`);
      setActiveTab('license');
    }, 2000);
  };

  const renderLicenseInfo = () => (
    <div>
      <div style={{
        background: 'white',
        borderRadius: '12px', 
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🔐 Current License Status
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{
              background: '#95a5a6',
              color: 'white', 
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              Free License
            </div>

            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#7f8c8d' }}>
              <strong>Limits:</strong> 👥 1 User | 📁 3 Projects
            </div>

            <div>
              <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                <strong>Included Features:</strong>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {currentLicense.features.map((feature, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#27ae60' }}>✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('plans')}
            style={{
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap' as const
            }}
          >
            💎 Upgrade License
          </button>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📋 License History
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { date: '2024-01-20', action: 'Free license activated', type: 'Free', status: 'Active' },
            { date: '2024-01-15', action: 'Account created', type: 'Free', status: 'Active' }
          ].map((entry, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                  {entry.action}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  {entry.date}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  background: '#e8f5e8',
                  color: '#27ae60',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {entry.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPricingPlans = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
          💎 Choose Your License Plan
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          Select the perfect plan for your needs. Secure online payment with instant license activation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {pricingPlans.map(plan => (
          <div key={plan.id} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: plan.popular ? '3px solid #667eea' : '1px solid #e1e5e9',
            position: 'relative' as const,
          }}>
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
              }}>
                Most Popular
              </div>
            )}

            <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                {plan.name}
              </h3>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea', marginBottom: '4px' }}>
                ${plan.price}
              </div>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>per month</div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '12px' }}>
                <strong>Features Included:</strong>
              </div>
              {plan.features.map((feature, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '8px', 
                  fontSize: '14px' 
                }}>
                  <span style={{ color: '#27ae60' }}>✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px', fontSize: '14px', color: '#7f8c8d' }}>
              <div><strong>Max Users:</strong> {plan.maxUsers === 999 ? 'Unlimited' : plan.maxUsers}</div>
              <div><strong>Max Projects:</strong> {plan.maxProjects === 999 ? 'Unlimited' : plan.maxProjects}</div>
              <div><strong>Best for:</strong> {plan.userTypes.join(', ')}</div>
            </div>

            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={processing}
              style={{
                width: '100%',
                padding: '12px',
                background: plan.popular ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: processing ? 0.7 : 1
              }}
            >
              {processing ? '🔄 Processing Payment...' : '💳 Buy License Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPayment = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
          💳 Secure Online Payment
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          Complete your license purchase with secure payment processing
        </p>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          💳 Select Payment Method
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { 
              id: 'card', 
              name: 'Credit/Debit Card', 
              desc: 'Visa, Mastercard, American Express - Instant activation', 
              icon: '💳' 
            },
            { 
              id: 'paypal', 
              name: 'PayPal', 
              desc: 'Pay with your PayPal account - Secure & fast', 
              icon: '🅿️' 
            },
            { 
              id: 'crypto', 
              name: 'Cryptocurrency', 
              desc: 'Bitcoin, Ethereum - Anonymous payment', 
              icon: '₿' 
            }
          ].map((method) => (
            <div key={method.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: paymentMethod === method.id ? '#e8f4fd' : '#f8f9fa',
              borderRadius: '8px',
              border: paymentMethod === method.id ? '2px solid #667eea' : '2px solid #e1e5e9',
              cursor: 'pointer'
            }}
            onClick={() => setPaymentMethod(method.id)}
            >
              <input 
                type="radio" 
                name="payment" 
                value={method.id}
                checked={paymentMethod === method.id}
                readOnly
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{method.name}</div>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>{method.desc}</div>
              </div>
              <div style={{ fontSize: '24px' }}>{method.icon}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Form */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📄 Billing Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Full Name *
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box' as const,
              }}
              placeholder="Professional Developer"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Email Address *
            </label>
            <input
              type="email"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box' as const,
              }}
              placeholder="professional@company.com"
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Address
          </label>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box' as const,
            }}
            placeholder="Street address"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              City
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box' as const,
              }}
                              placeholder="Business District"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Postal Code
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box' as const,
              }}
              placeholder="12345"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Country
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box' as const,
              }}
            >
              <option value="SA">Saudi Arabia</option>
              <option value="AE">United Arab Emirates</option>
              <option value="EG">Egypt</option>
              <option value="US">United States</option>
            </select>
          </div>
        </div>

        {/* Security Notice */}
        <div style={{
          background: '#e8f5e8',
          border: '1px solid #27ae60',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#155724'
        }}>
          🔒 <strong>Secure Payment:</strong> Your payment information is encrypted and secure. License will be activated instantly after payment confirmation.
        </div>

        <button
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🔐 Complete Payment & Activate License
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>
          🔐 License & Payment Center
        </h1>
        <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
          Manage your license and make secure online payments for instant activation
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {[
            { id: 'license', label: '🔐 My License', desc: 'Current license info' },
            { id: 'plans', label: '💎 Buy License', desc: 'Choose your plan' },
            { id: 'payment', label: '💳 Secure Payment', desc: 'Complete purchase' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '16px',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#7f8c8d',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center' as const,
                transition: 'all 0.2s',
              }}
            >
              <div>{tab.label}</div>
              {activeTab !== tab.id && (
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                  {tab.desc}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'license' && renderLicenseInfo()}
        {activeTab === 'plans' && renderPricingPlans()}
        {activeTab === 'payment' && renderPayment()}
      </div>
    </div>
  );
};

export default LicensePage; 