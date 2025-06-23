import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { LICENSE_FEATURES } from '../../../types/license';
import type { LicenseInfo } from '../../../types/license';

interface FeaturesListProps {
  licenseInfo: LicenseInfo;
}

const FeaturesList: React.FC<FeaturesListProps> = ({ licenseInfo }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Features</CardTitle>
        <CardDescription>Features enabled in your current license</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LICENSE_FEATURES.map((feature) => {
            const isAvailable = licenseInfo.features[feature.name] || false;
            
            return (
              <div 
                key={feature.name}
                className={`p-3 rounded-lg border transition-colors ${
                  isAvailable 
                    ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isAvailable ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    isAvailable ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {feature.display_name}
                  </span>
                </div>
                <p className={`text-xs ${
                  isAvailable ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {feature.description}
                </p>
                {!isAvailable && (
                  <div className="mt-2">
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      Upgrade Required
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturesList; 