'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from 'next/link';

export default function InstallSkillPage() {
    const router = useRouter();
    const [markdown, setMarkdown] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [tab, setTab] = useState('paste');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleInstall = async () => {
        if (tab === 'paste' && !markdown.trim()) return;
        if (tab === 'folder' && !folderPath.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/skills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    markdown: tab === 'paste' ? markdown : undefined,
                    folderPath: tab === 'folder' ? folderPath : undefined
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResult({ success: true, message: `Skill installed successfully!` });
                setMarkdown('');
                // Redirect after delay
                setTimeout(() => {
                    router.push('/dashboard/skills');
                    router.refresh();
                }, 1500);
            } else {
                setResult({ success: false, message: data.error || 'Failed to install skill.' });
            }
        } catch (error) {
            setResult({ success: false, message: 'Network error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard/skills">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">Install New Skill</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Import Skill</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Tabs defaultValue="paste" onValueChange={setTab}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="paste">Paste Markdown</TabsTrigger>
                            <TabsTrigger value="folder">Local Folder</TabsTrigger>
                        </TabsList>

                        <TabsContent value="paste">
                            <p className="text-sm text-muted-foreground mb-2">
                                Paste the content of your SKILL.md file below.
                            </p>
                            <Textarea
                                placeholder="---
name: my-skill
..."
                                className="font-mono min-h-[400px]"
                                value={markdown}
                                onChange={(e) => setMarkdown(e.target.value)}
                            />
                        </TabsContent>

                        <TabsContent value="folder">
                            <p className="text-sm text-muted-foreground mb-2">
                                Enter the absolute path to the skill folder containing SKILL.md.
                            </p>
                            <Input
                                placeholder="C:\MAMP\htdocs\agent\more_skills\skills\my-skill"
                                value={folderPath}
                                onChange={(e) => setFolderPath(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                The Agent must have read access to this directory.
                            </p>
                        </TabsContent>
                    </Tabs>

                    {result && (
                        <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "border-green-500 bg-green-50 text-green-900" : ""}>
                            {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                            <AlertDescription>{result.message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleInstall}
                            disabled={loading || (tab === 'paste' ? !markdown.trim() : !folderPath.trim())}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Install Skill
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
