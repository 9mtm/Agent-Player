'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, CheckCircle, XCircle, Code } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function SQLQueryEditor() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    try {
      setIsExecuting(true);
      setResult(null);

      const response = await fetch(`${BACKEND_URL}/api/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (data.mode === 'write') {
          toast.success(`Query executed successfully! ${data.changes} rows affected.`);
        } else {
          toast.success(`Query executed! ${data.count} rows returned.`);
        }
      } else {
        setResult({ error: data.message || data.error });
        toast.error(data.message || data.error || 'Query execution failed');
      }
    } catch (error: any) {
      setResult({ error: error.message });
      toast.error('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.error) {
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-destructive">{result.error}</pre>
          </CardContent>
        </Card>
      );
    }

    if (result.mode === 'write') {
      return (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Changes:</strong> {result.changes} rows affected
              </p>
              {result.lastInsertRowid && (
                <p className="text-sm">
                  <strong>Last Insert ID:</strong> {result.lastInsertRowid}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (result.mode === 'read' && result.rows) {
      if (result.rows.length === 0) {
        return (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Query executed successfully, but no rows were returned.
            </CardContent>
          </Card>
        );
      }

      const columns = Object.keys(result.rows[0]);

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Results
            </CardTitle>
            <CardDescription>
              {result.count} rows returned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="font-mono text-xs">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row: any, i: number) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col} className="font-mono text-xs max-w-xs truncate">
                          {row[col] === null ? (
                            <span className="text-muted-foreground italic">NULL</span>
                          ) : (
                            String(row[col])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            SQL Query Editor
          </CardTitle>
          <CardDescription>
            Execute SQL queries on your database (SELECT, INSERT, UPDATE, DELETE)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your SQL query here...&#10;Example: SELECT * FROM users LIMIT 10;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono text-sm min-h-[200px]"
          />

          <div className="flex gap-2">
            <Button
              onClick={handleExecute}
              disabled={isExecuting || !query.trim()}
              className="flex-1"
            >
              {isExecuting ? (
                <>Executing...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Query
                </>
              )}
            </Button>
            <Button onClick={handleClear} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Safety:</strong> Dangerous operations (DROP TABLE, TRUNCATE) are blocked</p>
            <p><strong>Examples:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>SELECT * FROM users WHERE id = 1</li>
              <li>UPDATE users SET name = 'New Name' WHERE id = 1</li>
              <li>DELETE FROM logs WHERE created_at {'<'} datetime('now', '-30 days')</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {renderResult()}
    </div>
  );
}
