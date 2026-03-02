'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Columns, Key, Link, FileCode } from 'lucide-react';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface Column {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface Index {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
  columns: Array<{ seqno: number; cid: number; name: string }>;
}

interface ForeignKey {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

interface TableStructureViewProps {
  tableName: string;
}

export function TableStructureView({ tableName }: TableStructureViewProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [foreignKeys, setForeignKeys] = useState<ForeignKey[]>([]);
  const [sql, setSql] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tableName) {
      fetchSchema();
    }
  }, [tableName]);

  const fetchSchema = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/schema`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setColumns(data.columns || []);
        setIndexes(data.indexes || []);
        setForeignKeys(data.foreignKeys || []);
        setSql(data.sql || '');
      }
    } catch (error) {
      console.error('Failed to fetch table schema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading schema...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Columns
          </CardTitle>
          <CardDescription>{columns.length} columns in {tableName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Nullable</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((col) => (
                  <TableRow key={col.cid}>
                    <TableCell className="font-mono font-medium">{col.name}</TableCell>
                    <TableCell className="font-mono text-sm">{col.type}</TableCell>
                    <TableCell>
                      {col.notnull === 0 ? (
                        <Badge variant="secondary">NULL</Badge>
                      ) : (
                        <Badge variant="outline">NOT NULL</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {col.dflt_value || '-'}
                    </TableCell>
                    <TableCell>
                      {col.pk === 1 && <Badge variant="default">PRIMARY</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Indexes */}
      {indexes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Indexes
            </CardTitle>
            <CardDescription>{indexes.length} indexes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indexes.map((idx, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-medium">{idx.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {idx.columns.map(c => c.name).join(', ')}
                      </TableCell>
                      <TableCell>
                        {idx.unique === 1 ? (
                          <Badge variant="default">UNIQUE</Badge>
                        ) : (
                          <Badge variant="secondary">INDEX</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Foreign Keys */}
      {foreignKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Foreign Keys
            </CardTitle>
            <CardDescription>{foreignKeys.length} foreign key constraints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>References</TableHead>
                    <TableHead>On Update</TableHead>
                    <TableHead>On Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foreignKeys.map((fk, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-medium">{fk.from}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {fk.table}.{fk.to}
                      </TableCell>
                      <TableCell className="text-sm">{fk.on_update}</TableCell>
                      <TableCell className="text-sm">{fk.on_delete}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SQL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            CREATE TABLE Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
            {sql}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
