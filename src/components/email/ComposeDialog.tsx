'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Link as LinkIcon,
    Send,
    X,
    Paperclip,
    Loader2,
} from 'lucide-react';
import { config } from '@/lib/config';
import { toast } from 'sonner';

const BACKEND_URL = config.backendUrl;

function authHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

interface ComposeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
    mode?: 'compose' | 'reply' | 'reply-all' | 'forward';
    originalEmail?: any;
    onSent?: () => void;
}

export function ComposeDialog({
    open,
    onOpenChange,
    accountId,
    mode = 'compose',
    originalEmail,
    onSent,
}: ComposeDialogProps) {
    const [to, setTo] = useState<string>('');
    const [cc, setCc] = useState<string>('');
    const [bcc, setBcc] = useState<string>('');
    const [subject, setSubject] = useState<string>('');
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            Placeholder.configure({
                placeholder: 'Write your message...',
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
            },
        },
    });

    // Populate fields based on mode
    useState(() => {
        if (mode === 'reply' && originalEmail) {
            setTo(originalEmail.from_address);
            setSubject(originalEmail.subject?.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject || '(No Subject)'}`);
        } else if (mode === 'reply-all' && originalEmail) {
            setTo(originalEmail.from_address);
            const toAddresses = JSON.parse(originalEmail.to_addresses || '[]');
            const ccAddresses = JSON.parse(originalEmail.cc_addresses || '[]');
            setCc([...toAddresses, ...ccAddresses].filter((a: string) => a !== originalEmail.from_address).join(', '));
            setSubject(originalEmail.subject?.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject || '(No Subject)'}`);
            setShowCc(true);
        } else if (mode === 'forward' && originalEmail) {
            setSubject(originalEmail.subject?.startsWith('Fwd:') ? originalEmail.subject : `Fwd: ${originalEmail.subject || '(No Subject)'}`);
        }
    });

    const handleSend = async () => {
        if (!to.trim()) {
            toast.error('Please enter at least one recipient');
            return;
        }

        if (!subject.trim() && !editor?.getHTML()) {
            toast.error('Please enter a subject or message');
            return;
        }

        setIsSending(true);

        try {
            let endpoint = `${BACKEND_URL}/api/email/accounts/${accountId}/send`;
            let body: any = {
                to: to.split(',').map(e => e.trim()).filter(e => e),
                subject: subject.trim(),
                body_html: editor?.getHTML(),
                body_text: editor?.getText(),
            };

            if (cc.trim()) {
                body.cc = cc.split(',').map(e => e.trim()).filter(e => e);
            }

            if (bcc.trim()) {
                body.bcc = bcc.split(',').map(e => e.trim()).filter(e => e);
            }

            // Handle reply/forward modes
            if (mode === 'reply' && originalEmail) {
                endpoint = `${BACKEND_URL}/api/email/accounts/${accountId}/reply/${originalEmail.id}`;
                body = {
                    body_html: editor?.getHTML(),
                    body_text: editor?.getText(),
                };
            } else if (mode === 'reply-all' && originalEmail) {
                endpoint = `${BACKEND_URL}/api/email/accounts/${accountId}/reply-all/${originalEmail.id}`;
                body = {
                    body_html: editor?.getHTML(),
                    body_text: editor?.getText(),
                };
            } else if (mode === 'forward' && originalEmail) {
                endpoint = `${BACKEND_URL}/api/email/accounts/${accountId}/forward/${originalEmail.id}`;
                body = {
                    to: to.split(',').map(e => e.trim()).filter(e => e),
                    body_html: editor?.getHTML(),
                    body_text: editor?.getText(),
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(body),
            });

            if (response.ok) {
                // Success - close dialog and reset
                onOpenChange(false);
                setTo('');
                setCc('');
                setBcc('');
                setSubject('');
                editor?.commands.setContent('');
                setShowCc(false);
                setShowBcc(false);
                setAttachments([]);

                if (onSent) {
                    onSent();
                }

                toast.success('Email sent successfully!');
            } else {
                const error = await response.json();
                toast.error(`Failed to send email: ${error.message || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('Failed to send email:', error);
            toast.error(`Failed to send email: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const toggleLink = () => {
        if (editor) {
            const url = prompt('Enter URL:');
            if (url) {
                editor.chain().focus().setLink({ href: url }).run();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>
                        {mode === 'reply' ? 'Reply' : mode === 'reply-all' ? 'Reply All' : mode === 'forward' ? 'Forward' : 'New Message'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6">
                    {/* To Field */}
                    <div className="space-y-2 py-3 border-b">
                        <div className="flex items-center gap-2">
                            <Label className="w-12 text-right text-sm text-muted-foreground">To</Label>
                            <Input
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="recipient@example.com"
                                className="flex-1 border-0 focus-visible:ring-0 px-0"
                            />
                            <div className="flex gap-2">
                                {!showCc && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowCc(true)}
                                        className="text-xs"
                                    >
                                        Cc
                                    </Button>
                                )}
                                {!showBcc && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowBcc(true)}
                                        className="text-xs"
                                    >
                                        Bcc
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cc Field */}
                    {showCc && (
                        <div className="space-y-2 py-3 border-b">
                            <div className="flex items-center gap-2">
                                <Label className="w-12 text-right text-sm text-muted-foreground">Cc</Label>
                                <Input
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    placeholder="cc@example.com"
                                    className="flex-1 border-0 focus-visible:ring-0 px-0"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setCc(''); setShowCc(false); }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Bcc Field */}
                    {showBcc && (
                        <div className="space-y-2 py-3 border-b">
                            <div className="flex items-center gap-2">
                                <Label className="w-12 text-right text-sm text-muted-foreground">Bcc</Label>
                                <Input
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    placeholder="bcc@example.com"
                                    className="flex-1 border-0 focus-visible:ring-0 px-0"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setBcc(''); setShowBcc(false); }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Subject Field */}
                    <div className="space-y-2 py-3 border-b">
                        <div className="flex items-center gap-2">
                            <Label className="w-12 text-right text-sm text-muted-foreground">Subject</Label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Email subject"
                                className="flex-1 border-0 focus-visible:ring-0 px-0"
                            />
                        </div>
                    </div>

                    {/* Editor Toolbar */}
                    <div className="flex items-center gap-1 py-2 border-b">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            className={editor?.isActive('bold') ? 'bg-muted' : ''}
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            className={editor?.isActive('italic') ? 'bg-muted' : ''}
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            className={editor?.isActive('bulletList') ? 'bg-muted' : ''}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                            className={editor?.isActive('orderedList') ? 'bg-muted' : ''}
                        >
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleLink}
                            className={editor?.isActive('link') ? 'bg-muted' : ''}
                        >
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm">
                            <Paperclip className="h-4 w-4 mr-2" />
                            Attach
                        </Button>
                    </div>

                    {/* Editor Content */}
                    <div className="min-h-[200px]">
                        <EditorContent editor={editor} />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {attachments.length > 0 && `${attachments.length} attachment(s)`}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSend}
                            disabled={isSending}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
