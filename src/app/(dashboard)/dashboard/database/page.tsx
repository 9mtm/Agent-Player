'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Table, Columns, Code, Download } from 'lucide-react';
import { TablesListView } from '@/components/database/TablesListView';
import { TableDataView } from '@/components/database/TableDataView';
import { TableStructureView } from '@/components/database/TableStructureView';
import { SQLQueryEditor } from '@/components/database/SQLQueryEditor';
import { ImportExportPanel } from '@/components/database/ImportExportPanel';
import { Card, CardContent } from '@/components/ui/card';

export default function DatabaseBrowserPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('browse');

  // Read table from URL on mount
  useEffect(() => {
    const tableFromUrl = searchParams.get('table');
    const tabFromUrl = searchParams.get('tab');

    if (tableFromUrl) {
      setSelectedTable(tableFromUrl);
      setActiveTab(tabFromUrl || 'data');
    }
  }, [searchParams]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setActiveTab('data');

    // Update URL
    const params = new URLSearchParams();
    params.set('table', tableName);
    params.set('tab', 'data');
    router.push(`/dashboard/database?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    // Update URL with tab
    if (selectedTable && tab !== 'browse' && tab !== 'sql' && tab !== 'export') {
      const params = new URLSearchParams();
      params.set('table', selectedTable);
      params.set('tab', tab);
      router.push(`/dashboard/database?${params.toString()}`, { scroll: false });
    } else {
      // For tabs that don't need a table, just change locally
      router.push('/dashboard/database', { scroll: false });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8" />
          Database Browser
        </h2>
        <p className="text-muted-foreground">
          Professional database management - browse tables, execute SQL, import/export data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Browse</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2" disabled={!selectedTable}>
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center gap-2" disabled={!selectedTable}>
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Structure</span>
          </TabsTrigger>
          <TabsTrigger value="sql" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">SQL</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <TablesListView onTableSelect={handleTableSelect} />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          {selectedTable ? (
            <TableDataView tableName={selectedTable} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a table from the Browse tab to view its data
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          {selectedTable ? (
            <TableStructureView tableName={selectedTable} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a table from the Browse tab to view its structure
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sql" className="space-y-4">
          <SQLQueryEditor />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <ImportExportPanel />
        </TabsContent>
      </Tabs>

      {selectedTable && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm text-muted-foreground">
            Selected table: <span className="font-mono font-medium text-foreground">{selectedTable}</span>
          </p>
        </div>
      )}
    </div>
  );
}
