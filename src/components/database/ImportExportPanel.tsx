'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileJson, FileCode, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function ImportExportPanel() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'sql' | 'csv' | 'json'>('json');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/database/tables`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables.map((t: any) => t.name));
        if (data.tables.length > 0) {
          setSelectedTable(data.tables[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const handleExport = async () => {
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    try {
      setIsExporting(true);

      const response = await fetch(`${BACKEND_URL}/api/database/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          table: selectedTable,
          format: selectedFormat,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTable}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(`Successfully exported ${selectedTable}.${selectedFormat}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Export failed');
      }
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = () => {
    switch (selectedFormat) {
      case 'json':
        return <FileJson className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'sql':
        return <FileCode className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Export table data in SQL, CSV, or JSON format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Table</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={selectedFormat} onValueChange={(v: any) => setSelectedFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="sql">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      SQL
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting || !selectedTable}
            className="w-full"
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                {getFormatIcon()}
                <span className="ml-2">Export as {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Export Formats:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li><strong>JSON:</strong> Structured data format, ideal for backups and data transfer</li>
              <li><strong>CSV:</strong> Spreadsheet format, compatible with Excel and Google Sheets</li>
              <li><strong>SQL:</strong> Full CREATE TABLE + INSERT statements for database migration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
