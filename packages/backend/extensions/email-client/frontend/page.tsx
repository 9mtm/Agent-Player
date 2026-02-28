'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Inbox,
    Plus,
    Settings,
    RefreshCw,
    Search,
    Mail,
    Send,
    FileText,
    Trash2,
    Archive,
    Star,
    StarOff,
    ChevronDown,
    Circle,
    CheckCircle2,
    Folder,
} from 'lucide-react';
import { config } from '@/lib/config';
import DOMPurify from 'dompurify';
import { ComposeDialog } from '@/components/email/ComposeDialog';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

// Folder icon mapping
function getFolderIcon(folderName: string) {
    const name = folderName.toLowerCase();
    if (name.includes('inbox')) return <Inbox className="h-4 w-4" />;
    if (name.includes('sent')) return <Send className="h-4 w-4" />;
    if (name.includes('draft')) return <FileText className="h-4 w-4" />;
    if (name.includes('trash') || name.includes('deleted')) return <Trash2 className="h-4 w-4" />;
    if (name.includes('archive')) return <Archive className="h-4 w-4" />;
    if (name.includes('spam') || name.includes('junk')) return <Mail className="h-4 w-4" />;
    return <Folder className="h-4 w-4" />;
}

export default function EmailClientPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [currentAccount, setCurrentAccount] = useState<any>(null);
    const [folders, setFolders] = useState<any[]>([]);
    const [emails, setEmails] = useState<any[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'reply-all' | 'forward'>('compose');
    const [composeOriginalEmail, setComposeOriginalEmail] = useState<any>(null);

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    // Load folders when account changes
    useEffect(() => {
        if (currentAccount) {
            loadFolders(currentAccount.id);
        }
    }, [currentAccount]);

    // Load emails when folder changes
    useEffect(() => {
        if (currentAccount && selectedFolder) {
            loadEmails(currentAccount.id, selectedFolder);
        }
    }, [currentAccount, selectedFolder]);

    const loadAccounts = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/accounts`, {
                headers: authHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setAccounts(data.accounts || []);

                // Set first account as current if available
                if (data.accounts && data.accounts.length > 0) {
                    const defaultAccount = data.accounts.find((a: any) => a.is_default) || data.accounts[0];
                    setCurrentAccount(defaultAccount);
                }
            }
        } catch (error) {
            console.error('Failed to load accounts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFolders = async (accountId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/accounts/${accountId}/folders`, {
                headers: authHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setFolders(data.folders || []);

                // Select Inbox by default
                const inbox = data.folders?.find((f: any) =>
                    f.name === 'INBOX' || f.name === 'Inbox' || f.name === '[Gmail]/All Mail'
                );
                if (inbox) {
                    setSelectedFolder(inbox.id);
                }
            }
        } catch (error) {
            console.error('Failed to load folders:', error);
        }
    };

    const loadEmails = async (accountId: string, folderId: string) => {
        try {
            const response = await fetch(
                `${BACKEND_URL}/api/email/accounts/${accountId}/emails?folder_id=${folderId}&limit=50&sort=date&order=desc`,
                { headers: authHeaders() }
            );

            if (response.ok) {
                const data = await response.json();
                setEmails(data.emails || []);

                // Select first email if available
                if (data.emails && data.emails.length > 0) {
                    setSelectedEmail(data.emails[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load emails:', error);
        }
    };

    const handleSync = async () => {
        if (!currentAccount || isSyncing) return;

        setIsSyncing(true);
        try {
            await fetch(`${BACKEND_URL}/api/email/accounts/${currentAccount.id}/sync`, {
                method: 'POST',
                headers: authHeaders(),
            });

            // Reload emails after sync
            if (selectedFolder) {
                await loadEmails(currentAccount.id, selectedFolder);
            }
        } catch (error) {
            console.error('Failed to sync:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleStar = async (emailId: string, isStarred: boolean) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/emails/${emailId}/star`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ is_starred: !isStarred }),
            });

            if (response.ok) {
                // Update local state
                setEmails(emails.map(e =>
                    e.id === emailId ? { ...e, is_starred: isStarred ? 0 : 1 } : e
                ));
                if (selectedEmail?.id === emailId) {
                    setSelectedEmail({ ...selectedEmail, is_starred: isStarred ? 0 : 1 });
                }
            }
        } catch (error) {
            console.error('Failed to toggle star:', error);
        }
    };

    const handleToggleRead = async (emailId: string, isRead: boolean) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/email/emails/${emailId}/read`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ is_read: !isRead }),
            });

            if (response.ok) {
                // Update local state
                setEmails(emails.map(e =>
                    e.id === emailId ? { ...e, is_read: isRead ? 0 : 1 } : e
                ));
                if (selectedEmail?.id === emailId) {
                    setSelectedEmail({ ...selectedEmail, is_read: isRead ? 0 : 1 });
                }
            }
        } catch (error) {
            console.error('Failed to toggle read:', error);
        }
    };

    // Sanitize HTML content
    const sanitizeHTML = (html: string) => {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'a', 'img', 'table', 'thead', 'tbody',
                'tr', 'td', 'th', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'class', 'style', 'target', 'rel',
                'width', 'height', 'align', 'border', 'cellpadding', 'cellspacing',
            ],
        });
    };

    // Compose dialog handlers
    const handleCompose = () => {
        setComposeMode('compose');
        setComposeOriginalEmail(null);
        setComposeOpen(true);
    };

    const handleReply = () => {
        if (!selectedEmail) return;
        setComposeMode('reply');
        setComposeOriginalEmail(selectedEmail);
        setComposeOpen(true);
    };

    const handleReplyAll = () => {
        if (!selectedEmail) return;
        setComposeMode('reply-all');
        setComposeOriginalEmail(selectedEmail);
        setComposeOpen(true);
    };

    const handleForward = () => {
        if (!selectedEmail) return;
        setComposeMode('forward');
        setComposeOriginalEmail(selectedEmail);
        setComposeOpen(true);
    };

    const handleEmailSent = () => {
        // Refresh emails after sending
        if (currentAccount && selectedFolder) {
            loadEmails(currentAccount.id, selectedFolder);
        }
    };

    // Empty state - no accounts
    if (!isLoading && accounts.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Card className="p-8 max-w-md text-center">
                    <div className="mb-4">
                        <Mail className="h-16 w-16 mx-auto text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">No Email Accounts</h2>
                    <p className="text-muted-foreground mb-6">
                        Add your first email account to get started
                    </p>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Email Account
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold">Email</h1>

                    {/* Account Switcher */}
                    {accounts.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {currentAccount?.email || 'Select Account'}
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                {accounts.map((account) => (
                                    <DropdownMenuItem
                                        key={account.id}
                                        onClick={() => setCurrentAccount(account)}
                                        className={currentAccount?.id === account.id ? 'bg-muted' : ''}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{account.email}</span>
                                            {account.name && (
                                                <span className="text-xs text-muted-foreground">
                                                    {account.name}
                                                </span>
                                            )}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Account
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                    </Button>
                    <Button variant="default" size="sm" onClick={handleCompose}>
                        <Plus className="h-4 w-4 mr-2" />
                        Compose
                    </Button>
                </div>
            </div>

            {/* 3-Pane Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Folders (250px) */}
                <div className="w-64 border-r bg-muted/10 flex flex-col">
                    <div className="p-3 border-b">
                        <h3 className="font-semibold text-sm mb-2">Folders</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {folders.map((folder) => (
                            <button
                                key={folder.id}
                                onClick={() => setSelectedFolder(folder.id)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center justify-between ${
                                    selectedFolder === folder.id ? 'bg-muted font-medium' : ''
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {getFolderIcon(folder.name)}
                                    <span>{folder.display_name || folder.name}</span>
                                </div>
                                {folder.unread_count > 0 && (
                                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                                        {folder.unread_count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-3 border-t">
                        <Button variant="outline" size="sm" className="w-full">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </div>

                {/* Middle Panel - Email List (350px) */}
                <div className="w-96 border-r bg-background flex flex-col">
                    <div className="p-3 border-b">
                        <h3 className="font-semibold text-sm">
                            {folders.find(f => f.id === selectedFolder)?.display_name || 'Emails'}
                            <span className="text-muted-foreground ml-2">
                                ({emails.length})
                            </span>
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {emails.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No emails in this folder</p>
                            </div>
                        ) : (
                            emails.map((email) => (
                                <div
                                    key={email.id}
                                    className={`px-4 py-3 border-b hover:bg-muted/50 cursor-pointer ${
                                        selectedEmail?.id === email.id ? 'bg-muted' : ''
                                    } ${email.is_read === 0 ? 'font-semibold' : ''}`}
                                    onClick={() => setSelectedEmail(email)}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleStar(email.id, email.is_starred === 1);
                                                }}
                                                className="flex-shrink-0"
                                            >
                                                {email.is_starred === 1 ? (
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                ) : (
                                                    <StarOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                )}
                                            </button>
                                            <span className="text-sm truncate">
                                                {email.from_name || email.from_address}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                            {new Date(email.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="text-sm truncate mb-1 ml-6">
                                        {email.subject || '(No Subject)'}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate ml-6">
                                        {email.body_snippet}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel - Email Detail (flex-1) */}
                <div className="flex-1 bg-background flex flex-col">
                    {selectedEmail ? (
                        <>
                            {/* Email Header */}
                            <div className="p-6 border-b">
                                <div className="flex items-start justify-between mb-2">
                                    <h2 className="text-xl font-semibold flex-1">
                                        {selectedEmail.subject || '(No Subject)'}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleStar(
                                                selectedEmail.id,
                                                selectedEmail.is_starred === 1
                                            )}
                                        >
                                            {selectedEmail.is_starred === 1 ? (
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            ) : (
                                                <StarOff className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleRead(
                                                selectedEmail.id,
                                                selectedEmail.is_read === 1
                                            )}
                                        >
                                            {selectedEmail.is_read === 1 ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                <Circle className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                        {selectedEmail.from_name || selectedEmail.from_address}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {new Date(selectedEmail.date).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    To: {JSON.parse(selectedEmail.to_addresses || '[]').join(', ')}
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedEmail.body_html ? (
                                    <div
                                        className="prose max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: sanitizeHTML(selectedEmail.body_html)
                                        }}
                                    />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans">
                                        {selectedEmail.body_text || 'No content'}
                                    </pre>
                                )}
                            </div>

                            {/* Email Actions */}
                            <div className="p-4 border-t flex gap-2">
                                <Button variant="default" size="sm" onClick={handleReply}>
                                    Reply
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleReplyAll}>
                                    Reply All
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleForward}>
                                    Forward
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p>Select an email to view</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Dialog */}
            {currentAccount && (
                <ComposeDialog
                    open={composeOpen}
                    onOpenChange={setComposeOpen}
                    accountId={currentAccount.id}
                    mode={composeMode}
                    originalEmail={composeOriginalEmail}
                    onSent={handleEmailSent}
                />
            )}
        </div>
    );
}
