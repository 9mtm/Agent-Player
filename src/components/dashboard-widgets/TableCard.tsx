/**
 * Table Card Widget
 * Displays tabular data (team members, etc.)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TableCardProps {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
}

export function TableCard({ title, columns, rows }: TableCardProps) {
  return (
    <Card className="h-full">
      {title && (
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col, index) => (
                  <th key={index} className="text-left py-2 px-2 font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4 text-muted-foreground">
                    No data available
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="py-2 px-2 truncate max-w-[150px]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
