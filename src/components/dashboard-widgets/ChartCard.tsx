/**
 * Chart Card Widget
 * Displays pie or bar charts
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartCardProps {
  title?: string;
  chart: {
    type: 'pie' | 'bar';
    data: ChartDataPoint[];
  };
}

export function ChartCard({ title, chart }: ChartCardProps) {
  if (chart.type === 'pie') {
    return <PieChart title={title} data={chart.data} />;
  }
  return <BarChart title={title} data={chart.data} />;
}

function PieChart({ title, data }: { title?: string; data: ChartDataPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <Card className="h-full">
      {title && (
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const previousAngles = data.slice(0, index).reduce((sum, d) => sum + ((d.value / total) * 360), 0);

              const startAngle = previousAngles - 90;
              const endAngle = startAngle + angle;

              const startX = 60 + 50 * Math.cos((startAngle * Math.PI) / 180);
              const startY = 60 + 50 * Math.sin((startAngle * Math.PI) / 180);
              const endX = 60 + 50 * Math.cos((endAngle * Math.PI) / 180);
              const endY = 60 + 50 * Math.sin((endAngle * Math.PI) / 180);

              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 60 60 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z`}
                  fill={colors[index % colors.length]}
                  opacity="0.8"
                />
              );
            })}
          </svg>
        </div>
        <div className="space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({ title, data }: { title?: string; data: ChartDataPoint[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <Card className="h-full">
      {title && (
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = (item.value / max) * 100;
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{item.label}</span>
                  <span className="font-medium ml-2">{item.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
