import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

const BillingPlansComponent: React.FC = () => {
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBillingPlans();
  }, []);

  const fetchBillingPlans = async () => {
    try {
      const response = await api.get('/user/billing');
      setBillingPlans(response.data);
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      setMessage('Failed to load billing plans');
    }
  };

  const handlePlanSelection = async (planId: string) => {
    try {
      await api.post('/user/billing', { planId });
      setSelectedPlan(planId);
      setMessage('Billing plan updated successfully');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error updating billing plan:', error);
      setMessage('Failed to update billing plan');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="billing-plans-container">
      <h2>Billing Plans</h2>
      {message && <div className="message">{message}</div>}
      <div className="plans-grid">
        {billingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
            onClick={() => handlePlanSelection(plan.id)}
          >
            <h3>{plan.name}</h3>
            <p className="price">${plan.price}/month</p>
            <ul className="features">
              {plan.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <button
              className={`select-plan-btn ${
                selectedPlan === plan.id ? 'selected' : ''
              }`}
            >
              {selectedPlan === plan.id ? 'Current Plan' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingPlansComponent; 