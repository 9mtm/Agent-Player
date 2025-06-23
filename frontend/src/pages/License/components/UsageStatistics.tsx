import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { Users, Bot, CheckSquare, MessageSquare } from 'lucide-react';
import { getUsagePercentage } from '../utils/constants';
import type { LicenseInfo } from '../../../types/license';

interface UsageStatisticsProps {
  licenseInfo: LicenseInfo;
}

const UsageStatistics: React.FC<UsageStatisticsProps> = ({ licenseInfo }) => {
  const usageItems = [
    {
      icon: Users,
      label: 'Users',
      current: licenseInfo.limits.users.current,
      max: licenseInfo.limits.users.max,
    },
    {
      icon: Bot,
      label: 'Agents',
      current: licenseInfo.limits.agents.current,
      max: licenseInfo.limits.agents.max,
    },
    {
      icon: CheckSquare,
      label: 'Tasks',
      current: licenseInfo.limits.tasks.current,
      max: licenseInfo.limits.tasks.max,
    },
    {
      icon: MessageSquare,
      label: 'Conversations',
      current: licenseInfo.limits.conversations.current,
      max: licenseInfo.limits.conversations.max,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
        <CardDescription>Current usage vs maximum allowed limits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {usageItems.map((item) => {
            const Icon = item.icon;
            const percentage = getUsagePercentage(item.current, item.max);
            
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <Label className="text-sm font-medium">{item.label}</Label>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.current}</span>
                    <span>/ {item.max}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-xs text-gray-500 text-center">
                    {percentage.toFixed(1)}% used
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageStatistics; 