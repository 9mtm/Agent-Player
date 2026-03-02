'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Table as TableIcon,
  Edit, Trash2, Save, X, Plus, Download, FileJson, FileSpreadsheet, FileCode
} from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface TableDataViewProps {
  tableName: string;
}

export function TableDataView({ tableName }: TableDataViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string>('id');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [isInserting, setIsInserting] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (tableName) {
      setPage(1);
      fetchPrimaryKey();
      fetchData(1, limit);
    }
  }, [tableName]);

  useEffect(() => {
    if (tableName) {
      fetchData(page, limit);
    }
  }, [page, limit]);

  const fetchPrimaryKey = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/schema`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const schema = await response.json();
        const pkColumn = schema.columns.find((col: any) => col.pk === 1);
        if (pkColumn) {
          setPrimaryKey(pkColumn.name);
        }

        // Always set columns from schema (even if table is empty)
        if (schema.columns && schema.columns.length > 0) {
          const columnNames = schema.columns.map((col: any) => col.name);
          setColumns(columnNames);
        }
      }
    } catch (error) {
      console.error('Failed to fetch primary key:', error);
    }
  };

  const fetchData = async (currentPage: number, currentLimit: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/database/table/${tableName}/data?page=${currentPage}&limit=${currentLimit}`,
        { headers: authHeaders() }
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);

        // Only override columns if we got data and columns weren't set from schema
        if (result.data.length > 0 && columns.length === 0) {
          setColumns(Object.keys(result.data[0]));
        }
      }
    } catch (error) {
      console.error('Failed to fetch table data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map(row => row[primaryKey]));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: any, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleEdit = (row: any) => {
    setEditingRow(row);
    setEditedData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/row`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          primaryKey,
          primaryValue: editingRow[primaryKey],
          data: editedData,
        }),
      });

      if (response.ok) {
        toast.success('Row updated successfully');
        setEditingRow(null);
        setEditedData({});
        fetchData(page, limit);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update row');
      }
    } catch (error) {
      toast.error('Failed to update row');
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Are you sure you want to delete this row?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/row`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          primaryKey,
          primaryValue: id,
        }),
      });

      if (response.ok) {
        toast.success('Row deleted successfully');
        fetchData(page, limit);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete row');
      }
    } catch (error) {
      toast.error('Failed to delete row');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) {
      toast.error('Please select rows to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedRows.size} rows?`)) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/rows/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          primaryKey,
          ids: Array.from(selectedRows),
        }),
      });

      if (response.ok) {
        toast.success(`${selectedRows.size} rows deleted successfully`);
        setSelectedRows(new Set());
        fetchData(page, limit);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete rows');
      }
    } catch (error) {
      toast.error('Failed to delete rows');
    }
  };

  const handleBulkExport = async (format: 'json' | 'csv' | 'sql') => {
    if (selectedRows.size === 0) {
      toast.error('Please select rows to export');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/rows/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          primaryKey,
          ids: Array.from(selectedRows),
          format,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_selected.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`${selectedRows.size} rows exported as ${format.toUpperCase()}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to export rows');
      }
    } catch (error) {
      toast.error('Failed to export rows');
    }
  };

  const handleInsertRow = () => {
    setIsInserting(true);
    const initialData: Record<string, any> = {};
    columns.forEach(col => {
      initialData[col] = '';
    });
    setNewRowData(initialData);
  };

  const handleCancelInsert = () => {
    setIsInserting(false);
    setNewRowData({});
  };

  const handleSaveInsert = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/database/table/${tableName}/row`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          data: newRowData,
        }),
      });

      if (response.ok) {
        toast.success('Row inserted successfully');
        setIsInserting(false);
        setNewRowData({});
        fetchData(page, limit);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to insert row');
      }
    } catch (error) {
      toast.error('Failed to insert row');
    }
  };

  if (isLoading && data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                {tableName}
              </CardTitle>
              <CardDescription>
                Showing {data.length} of {total} rows
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions */}
          {selectedRows.size > 0 && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedRows.size} row(s) selected</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkExport('json')}>
                <FileJson className="h-4 w-4 mr-1" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkExport('sql')}>
                <FileCode className="h-4 w-4 mr-1" />
                Export SQL
              </Button>
            </div>
          )}

          {/* Insert Row Button */}
          {!isInserting && (
            <div className="mb-4">
              <Button onClick={handleInsertRow}>
                <Plus className="h-4 w-4 mr-2" />
                Insert New Row
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedRows.size === data.length && data.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {columns.map((col) => (
                    <TableHead key={col} className="font-mono text-xs">
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Insert Row Form */}
                {isInserting && (
                  <TableRow className="bg-green-50 dark:bg-green-950">
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" onClick={handleSaveInsert}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelInsert}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col}>
                        <Input
                          value={newRowData[col] || ''}
                          onChange={(e) => setNewRowData({ ...newRowData, [col]: e.target.value })}
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                )}

                {/* Data Rows */}
                {data.map((row, i) => {
                  const isEditing = editingRow && editingRow[primaryKey] === row[primaryKey];
                  const isSelected = selectedRows.has(row[primaryKey]);

                  return (
                    <TableRow key={i} className={isEditing ? 'bg-blue-50 dark:bg-blue-950' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(row[primaryKey], !!checked)}
                        />
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col} className="font-mono text-xs max-w-xs">
                          {isEditing ? (
                            <Input
                              value={editedData[col] ?? ''}
                              onChange={(e) => setEditedData({ ...editedData, [col]: e.target.value })}
                              className="h-8 text-xs font-mono"
                            />
                          ) : (
                            <span className="truncate block">
                              {row[col] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={handleSaveEdit}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(row[primaryKey])}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {data.length === 0 && !isInserting && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="text-center py-8 text-muted-foreground">
                      No data in table
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
