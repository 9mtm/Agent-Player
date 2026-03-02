'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RefreshCw, Database, Eye, FileText } from 'lucide-react';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface TableInfo {
  name: string;
  rows: number;
  sql: string;
}

interface TablesListViewProps {
  onTableSelect: (tableName: string) => void;
}

export function TablesListView({ onTableSelect }: TablesListViewProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [filteredTables, setFilteredTables] = useState<TableInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/database/tables`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
        setFilteredTables(data.tables || []);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTables(tables);
    } else {
      const filtered = tables.filter(table =>
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTables(filtered);
    }
  }, [searchQuery, tables]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Tables
            </CardTitle>
            <CardDescription>
              Browse all tables in your database ({tables.length} tables)
            </CardDescription>
          </div>
          <Button onClick={fetchTables} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading tables...' : searchQuery ? 'No tables found' : 'No tables in database'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTables.map((table) => (
                  <TableRow key={table.name} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium font-mono">{table.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {table.rows.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTableSelect(table.name)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
