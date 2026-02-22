import { skillsClient } from "@/lib/skills/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SkillDetailPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;

    let skill = null;
    try {
        skill = await skillsClient.get(name);
    } catch (e) {
        console.error('Failed to fetch skill:', e);
    }

    if (!skill) {
        redirect('/dashboard/skills');
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/skills">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {skill.name}
                            <Badge variant="outline">v{skill.version}</Badge>
                        </h1>
                        <p className="text-muted-foreground">{skill.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm">
                        <Play className="mr-2 h-4 w-4" />
                        Run
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2 space-y-6">
                    <Tabs defaultValue="instructions" className="w-full">
                        <TabsList>
                            <TabsTrigger value="instructions">Instructions</TabsTrigger>
                            <TabsTrigger value="triggers">Triggers</TabsTrigger>
                        </TabsList>
                        <TabsContent value="instructions">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Usage Instructions</CardTitle>
                                </CardHeader>
                                <CardContent className="prose dark:prose-invert max-w-none">
                                    <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-lg">
                                        {skill.instructions || 'No instructions available.'}
                                    </pre>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="triggers">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Trigger Words</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        This skill will be activated when a message contains any of these words:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {skill.triggers && skill.triggers.length > 0 ? (
                                            skill.triggers.map((trigger) => (
                                                <Badge key={trigger} variant="secondary" className="text-sm">
                                                    {trigger}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground">No triggers defined</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase text-muted-foreground">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Name</span>
                                <span className="font-mono">{skill.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version</span>
                                <span>{skill.version}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Author</span>
                                <span>{skill.author || 'Unknown'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase text-muted-foreground">File Location</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                skills/{skill.name}.md
                            </code>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
