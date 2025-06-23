import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { LICENSE_TYPE_CONFIGS } from '../../../types/license';
import { isFormValid } from '../utils/constants';
import type { OnlineLicenseRequest, LicenseType } from '../../../types/license';

interface RequestLicenseFormProps {
  licenseRequest: OnlineLicenseRequest;
  setLicenseRequest: React.Dispatch<React.SetStateAction<OnlineLicenseRequest>>;
  onRequestLicense: () => void;
  loading: boolean;
}

const RequestLicenseForm: React.FC<RequestLicenseFormProps> = ({
  licenseRequest,
  setLicenseRequest,
  onRequestLicense,
  loading
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestLicense();
  };

  const isValid = isFormValid.licenseRequest(licenseRequest);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request New License</CardTitle>
        <CardDescription>
          Request a new license from the central server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={licenseRequest.name}
                onChange={(e) => setLicenseRequest(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={licenseRequest.email}
                onChange={(e) => setLicenseRequest(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email address"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company Name (Optional)</Label>
              <Input
                id="company"
                value={licenseRequest.company_name}
                onChange={(e) => setLicenseRequest(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Enter your company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="license-type">License Type</Label>
              <select
                id="license-type"
                value={licenseRequest.license_type}
                onChange={(e) => setLicenseRequest(prev => ({ ...prev, license_type: e.target.value as LicenseType }))}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(LICENSE_TYPE_CONFIGS).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.display_name} - {config.price}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="users">Number of Users</Label>
              <Input
                id="users"
                type="number"
                min="1"
                max="1000"
                value={licenseRequest.requested_users}
                onChange={(e) => setLicenseRequest(prev => ({ ...prev, requested_users: parseInt(e.target.value) || 1 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agents">Number of Agents</Label>
              <Input
                id="agents"
                type="number"
                min="1"
                max="10000"
                value={licenseRequest.requested_agents}
                onChange={(e) => setLicenseRequest(prev => ({ ...prev, requested_agents: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </div>
          
          <Button 
            type="submit"
            disabled={loading || !isValid}
            className="w-full"
          >
            {loading ? 'Requesting License...' : 'Request License'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RequestLicenseForm; 