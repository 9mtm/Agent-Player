import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import { Calendar } from 'lucide-react';
import { getStatusIcon, getStatusBadgeConfig } from '../utils/constants';
import { LICENSE_TYPE_CONFIGS } from '../../../types/license';
import type { LicenseInfo } from '../../../types/license';

interface LicenseOverviewProps {
  licenseInfo: LicenseInfo;
}

const LicenseOverview: React.FC<LicenseOverviewProps> = ({ licenseInfo }) => {
  const statusConfig = getStatusBadgeConfig(licenseInfo.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(licenseInfo.status)}
              License Information
            </CardTitle>
            <CardDescription>
              {LICENSE_TYPE_CONFIGS[licenseInfo.license_type].description}
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">License Type</Label>
              <div className="flex items-center gap-2">
                <Badge className={LICENSE_TYPE_CONFIGS[licenseInfo.license_type].color}>
                  {LICENSE_TYPE_CONFIGS[licenseInfo.license_type].display_name}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">License Owner</Label>
              <p className="text-sm">{licenseInfo.owner_name}</p>
            </div>
            {licenseInfo.company_name && (
              <div>
                <Label className="text-sm font-medium">Company</Label>
                <p className="text-sm">{licenseInfo.company_name}</p>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">License Status</Label>
              <div className="flex items-center gap-2">
                {licenseInfo.is_active ? (
                  <span className="text-green-600 text-sm">Active</span>
                ) : (
                  <span className="text-red-600 text-sm">Inactive</span>
                )}
              </div>
            </div>
            
            {licenseInfo.days_until_expiry > 0 && (
              <div>
                <Label className="text-sm font-medium">Expires In</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{licenseInfo.days_until_expiry} days</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LicenseOverview; 