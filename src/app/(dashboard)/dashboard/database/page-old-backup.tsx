'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, HardDrive, Download, Upload, RefreshCw, Trash2, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from 'sonner';

interface TableStats {
    name: string;
    description: string;
    records: number;
    size: number;
}

interface DatabaseStats {
    totalSize: number;
    totalRecords: number;
    tables: TableStats[];
    lastModified: string;
}

interface Backup {
    filename: string;
    size: number;
    created: string;
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Helper function to format time ago
function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

export default function DatabasePage() {
    const [stats, setStats] = useState<DatabaseStats | null>(null);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            setError(null);
            const response = await fetch(`${BACKEND_URL}/api/database/stats`);

            if (!response.ok) {
                throw new Error('Failed to fetch database statistics');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            console.error('Error fetching database stats:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchBackups = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/database/backups`);
            if (response.ok) {
                const data = await response.json();
                setBackups(data.backups || []);
            }
        } catch (err) {
            console.error('Error fetching backups:', err);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchBackups();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchStats();
        fetchBackups();
    };

    const handleVacuum = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/database/vacuum`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Database vacuumed! Saved ${formatBytes(data.savedSpace)}`);
                fetchStats();
            }
        } catch (err) {
            toast.error('Failed to vacuum database');
        }
    };

    const handleRestore = async (filename: string) => {
        if (!confirm(`Restore database from "${filename}"? Current database will be backed up first.`)) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/database/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Database restored! Pre-restore backup: ${data.preRestoreBackup}`);
                fetchStats();
                fetchBackups();
            } else {
                const error = await response.json();
                toast.error(`Failed to restore: ${error.error}`);
            }
        } catch (err) {
            toast.error('Failed to restore database');
        }
    };

    const handleOptimize = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/database/optimize`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Database optimized! ${data.tablesAnalyzed} tables analyzed`);
                fetchStats();
            }
        } catch (err) {
            toast.error('Failed to optimize database');
        }
    };

    const handleClean = async () => {
        if (!confirm('Delete records older than 90 days? This cannot be undone.')) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/database/clean`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ daysOld: 90 }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Cleaned ${data.deletedCount} old records`);
                fetchStats();
            }
        } catch (err) {
            toast.error('Failed to clean database');
        }
    };

    const handleClearAll = async () => {
        const confirmText = 'DELETE ALL DATA';
        const userInput = prompt(
            `WARNING: This will delete ALL records from the database!\n\nType "${confirmText}" to confirm:`
        );

        if (userInput !== confirmText) {
            toast.info('Clear all cancelled');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/database/clear`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`${data.deletedCount} records deleted from ${data.tablesCleared} tables`);
                fetchStats();
                fetchBackups();
            }
        } catch (err) {
            toast.error('Failed to clear database');
        }
    };

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/database/backup`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Backup created: ${data.backup.filename}`);
                fetchBackups();
                fetchStats();
            } else {
                const error = await response.json();
                toast.error(`Failed to create backup: ${error.error}`);
            }
        } catch (err) {
            toast.error('Failed to create backup');
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleDownloadBackup = (filename: string) => {
        window.open(`${BACKEND_URL}/api/database/backups/${filename}`, '_blank');
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!confirm(`Delete backup "${filename}"?`)) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/database/backups/${filename}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Backup deleted successfully');
                fetchBackups();
            } else {
                const error = await response.json();
                toast.error(`Failed to delete backup: ${error.error}`);
            }
        } catch (err) {
            toast.error('Failed to delete backup');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-destructive font-medium">Error: {error}</p>
                <Button onClick={handleRefresh}>Retry</Button>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    // Calculate storage usage percentage (assuming 10GB limit)
    const maxStorage = 10 * 1024 * 1024 * 1024; // 10 GB in bytes
    const storagePercent = (stats.totalSize / maxStorage) * 100;

    // Filter tables to show only top 5 most populated
    const topTables = stats.tables.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Database Management</h2>
                    <p className="text-muted-foreground">
                        Monitor and manage your database storage and backups.
                    </p>
                </div>
                <Button onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </Button>
            </div>

            {/* Database Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Size
                        </CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(stats.totalSize)}</div>
                        <p className="text-xs text-muted-foreground">
                            of {formatBytes(maxStorage)} available
                        </p>
                        <Progress value={storagePercent} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Records
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            across {stats.tables.length} tables
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Last Modified
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{timeAgo(stats.lastModified)}</div>
                        <p className="text-xs text-muted-foreground">
                            Real-time data
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Database Tables */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Database Tables
                    </CardTitle>
                    <CardDescription>
                        Overview of your database tables (top 5 by record count)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {topTables.map((table) => (
                            <div key={table.name} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium capitalize">{table.name.replace(/_/g, ' ')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {table.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">{table.records.toLocaleString()} records</span>
                                    <span className="text-sm text-muted-foreground">{formatBytes(table.size)}</span>
                                    <Button variant="ghost" size="sm">
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {stats.tables.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No tables found in database
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Backup & Restore */}
            <Card>
                <CardHeader>
                    <CardTitle>Backup & Restore</CardTitle>
                    <CardDescription>
                        Manage database backups and restore points
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={handleCreateBackup}
                            disabled={isCreatingBackup}
                        >
                            {isCreatingBackup ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Create Backup
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium">Recent Backups</h4>
                            <Badge variant="secondary">{backups.length} backups</Badge>
                        </div>

                        {backups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-lg">
                                No backups available yet. Create your first backup above.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {backups.slice(0, 5).map((backup) => (
                                    <div key={backup.filename} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{backup.filename}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatBytes(backup.size)} • {timeAgo(backup.created)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRestore(backup.filename)}
                                                title="Restore this backup"
                                            >
                                                <Upload className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDownloadBackup(backup.filename)}
                                                title="Download backup"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteBackup(backup.filename)}
                                                title="Delete backup"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Maintenance */}
            <Card>
                <CardHeader>
                    <CardTitle>Database Maintenance</CardTitle>
                    <CardDescription>
                        Optimize and clean up your database
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Vacuum Database</p>
                            <p className="text-sm text-muted-foreground">
                                Compact and reclaim unused space (SQLite VACUUM)
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleVacuum}>
                            Vacuum
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Optimize Database</p>
                            <p className="text-sm text-muted-foreground">
                                Analyze and optimize database performance
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleOptimize}>
                            Optimize
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Clean Old Records</p>
                            <p className="text-sm text-muted-foreground">
                                Remove records older than 90 days
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleClean}>
                            Clean
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Irreversible database actions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Clear All Data</p>
                            <p className="text-sm text-muted-foreground">
                                Delete all records from database
                            </p>
                        </div>
                        <Button variant="destructive" onClick={handleClearAll}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
