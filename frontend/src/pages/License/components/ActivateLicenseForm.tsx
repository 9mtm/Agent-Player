import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { isFormValid } from '../utils/constants';
import type { LicenseActivation } from '../../../types/license';

interface RegistrationData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

interface ActivateLicenseFormProps {
  activationData: LicenseActivation;
  setActivationData: React.Dispatch<React.SetStateAction<LicenseActivation>>;
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  onRegisterWithLicense: () => void;
  loading: boolean;
}

const ActivateLicenseForm: React.FC<ActivateLicenseFormProps> = ({
  activationData,
  setActivationData,
  registrationData,
  setRegistrationData,
  onRegisterWithLicense,
  loading
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegisterWithLicense();
  };

  const isValid = isFormValid.activation(activationData, registrationData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activate License</CardTitle>
        <CardDescription>
          Activate an existing license and create a new account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* License Activation Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">License Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license-key">License Key *</Label>
                <Input
                  id="license-key"
                  value={activationData.license_key}
                  onChange={(e) => setActivationData(prev => ({ ...prev, license_key: e.target.value }))}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="owner-name">License Owner Name</Label>
                <Input
                  id="owner-name"
                  value={activationData.owner_name}
                  onChange={(e) => setActivationData(prev => ({ ...prev, owner_name: e.target.value }))}
                  placeholder="Enter license owner name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="owner-email">License Owner Email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={activationData.owner_email}
                  onChange={(e) => setActivationData(prev => ({ ...prev, owner_email: e.target.value }))}
                  placeholder="Enter license owner email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="license-company">Company (Optional)</Label>
                <Input
                  id="license-company"
                  value={activationData.company_name}
                  onChange={(e) => setActivationData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
            </div>
          </div>

          {/* User Registration Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Create User Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={registrationData.username}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email Address *</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={registrationData.email}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={registrationData.password}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name *</Label>
                <Input
                  id="full-name"
                  value={registrationData.full_name}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
          </div>
          
          <Button 
            type="submit"
            disabled={loading || !isValid}
            className="w-full"
          >
            {loading ? 'Registering and Activating...' : 'Register and Activate License'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ActivateLicenseForm; 