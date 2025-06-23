import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Key } from 'lucide-react';

interface NoLicenseProps {
  onRequestLicense: () => void;
  onActivateLicense: () => void;
}

const NoLicense: React.FC<NoLicenseProps> = ({ 
  onRequestLicense, 
  onActivateLicense 
}) => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Active License</h3>
        <p className="text-gray-600 mb-4">
          A license must be activated to access the system
        </p>
        <div className="space-x-2">
          <Button onClick={onRequestLicense}>
            Request New License
          </Button>
          <Button variant="outline" onClick={onActivateLicense}>
            Activate Existing License
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NoLicense; 