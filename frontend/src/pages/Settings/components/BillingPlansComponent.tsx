import React, { useState, useEffect } from 'react';

const BillingPlansComponent: React.FC = () => {
  const [billingData, setBillingData] = useState({
    current_plan: 'free',
    billing_cycle: 'monthly',
    auto_renewal: true,
    payment_method: '',
    billing_address: '',
    tax_id: '',
    invoice_email: '',
    usage_alerts: true,
    billing_history: []
  });

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: 0,
      features: ['5 AI Requests/day', 'Basic Support', '1 User'],
      color: '#95a5a6'
    },
    {
      id: 'basic',
      name: 'Basic Plan', 
      price: 9.99,
      features: ['100 AI Requests/day', 'Email Support', '5 Users', 'Basic Analytics'],
      color: '#3498db'
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: 29.99,
      features: ['1000 AI Requests/day', 'Priority Support', '20 Users', 'Advanced Analytics', 'API Access'],
      color: '#9b59b6'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.99,
      features: ['Unlimited Requests', '24/7 Support', 'Unlimited Users', 'Custom Integration', 'SLA'],
      color: '#e74c3c'
    }
  ];

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadBillingSettings = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/settings/billing');
      if (response.ok) {
        const data = await response.json();
        setBillingData(data);
      }
    } catch (error) {
      console.error('Error loading billing settings:', error);
    }
  };

  useEffect(() => {
    loadBillingSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/settings/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billingData)
      });

      if (response.ok) {
        setMessage('✅ Billing settings saved successfully!');
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch (error) {
      setMessage('❌ Error saving settings');
      console.error('Error:', error);
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handlePlanChange = (planId: string) => {
    setBillingData(prev => ({ ...prev, current_plan: planId }));
    setMessage(`📋 Plan will be changed to ${plans.find(p => p.id === planId)?.name} on next billing cycle`);
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('✅') ? '#d4edda' : message.includes('📋') ? '#d1ecf1' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : message.includes('📋') ? '#0c5460' : '#721c24',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Current Plan Status */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>
          💳 Current Subscription
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {plans.find(p => p.id === billingData.current_plan)?.name}
            </div>
            <div style={{ opacity: 0.9 }}>
              ${plans.find(p => p.id === billingData.current_plan)?.price}/{billingData.billing_cycle === 'monthly' ? 'month' : 'year'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Next billing: Dec 15, 2024</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Auto-renewal: {billingData.auto_renewal ? 'On' : 'Off'}</div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📊 Available Plans
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: billingData.current_plan === plan.id ? `3px solid ${plan.color}` : '2px solid #e1e5e9',
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              {billingData.current_plan === plan.id && (
                <div style={{
                  position: 'absolute',
                  top: '-1px',
                  right: '16px',
                  background: plan.color,
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '0 0 8px 8px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  CURRENT
                </div>
              )}

              <div style={{
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', margin: '0 0 8px 0' }}>
                  {plan.name}
                </h4>
                <div style={{ fontSize: '32px', fontWeight: '700', color: plan.color }}>
                  ${plan.price}
                  <span style={{ fontSize: '14px', fontWeight: '400', color: '#7f8c8d' }}>
                    /{billingData.billing_cycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#2c3e50'
                  }}>
                    <span style={{ color: plan.color }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanChange(plan.id)}
                disabled={billingData.current_plan === plan.id}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: billingData.current_plan === plan.id ? '#95a5a6' : plan.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: billingData.current_plan === plan.id ? 'not-allowed' : 'pointer'
                }}
              >
                {billingData.current_plan === plan.id ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Settings */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          ⚙️ Billing Settings
        </h3>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Billing Cycle
              </label>
              <select
                value={billingData.billing_cycle}
                onChange={(e) => setBillingData(prev => ({ ...prev, billing_cycle: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly (20% discount)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Invoice Email
              </label>
              <input
                type="email"
                value={billingData.invoice_email}
                onChange={(e) => setBillingData(prev => ({ ...prev, invoice_email: e.target.value }))}
                placeholder="billing@company.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Tax ID / VAT Number
            </label>
            <input
              type="text"
              value={billingData.tax_id}
              onChange={(e) => setBillingData(prev => ({ ...prev, tax_id: e.target.value }))}
              placeholder="GB123456789"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={billingData.auto_renewal}
                onChange={(e) => setBillingData(prev => ({ ...prev, auto_renewal: e.target.checked }))}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                Enable auto-renewal
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={billingData.usage_alerts}
                onChange={(e) => setBillingData(prev => ({ ...prev, usage_alerts: e.target.checked }))}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                Send usage alerts at 80% limit
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📄 Recent Invoices
        </h3>

        <div style={{ 
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e1e5e9',
          overflow: 'hidden'
        }}>
          {[
            { date: 'Nov 15, 2024', amount: '$29.99', status: 'Paid', plan: 'Pro Plan' },
            { date: 'Oct 15, 2024', amount: '$29.99', status: 'Paid', plan: 'Pro Plan' },
            { date: 'Sep 15, 2024', amount: '$9.99', status: 'Paid', plan: 'Basic Plan' },
            { date: 'Aug 15, 2024', amount: '$9.99', status: 'Paid', plan: 'Basic Plan' }
          ].map((invoice, index) => (
            <div key={index} style={{
              padding: '16px',
              borderBottom: index < 3 ? '1px solid #e1e5e9' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#2c3e50' }}>{invoice.plan}</div>
                <div style={{ color: '#7f8c8d', fontSize: '14px' }}>{invoice.date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontWeight: '600', color: '#2c3e50' }}>{invoice.amount}</div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#d4edda',
                  color: '#155724'
                }}>
                  {invoice.status}
                </span>
                <button style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: '#3498db',
                  border: '1px solid #3498db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '16px 48px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}
        >
          {loading ? '⏳ Saving...' : '💾 Save Billing Settings'}
        </button>
      </div>
    </div>
  );
};

export default BillingPlansComponent; 