import { skillsClient, type Skill } from "@/lib/skills/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Terminal, Search } from "lucide-react";
import Link from "next/link";

export default async function SkillsPage() {
    let skills: Skill[] = [];
    let error: string | null = null;

    try {
        skills = await skillsClient.list();
    } catch (e) {
        error = e instanceof Error ? e.message : 'Failed to load skills';
        console.error('Failed to load skills:', e);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Skills Registry</h2>
                    <p className="text-muted-foreground">
                        Manage installed skills and capabilities for your agents.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/skills/discover">
                            <Search className="mr-2 h-4 w-4" />
                            Discover
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/skills/install">
                            <Plus className="mr-2 h-4 w-4" />
                            Install Skill
                        </Link>
                    </Button>
                </div>
            </div>

            {error ? (
                <Card className="border-destructive">
                    <CardContent className="py-10 text-center text-destructive">
                        <Terminal className="mx-auto h-10 w-10 mb-4 opacity-50" />
                        <p>Failed to load skills</p>
                        <p className="text-sm">{error}</p>
                        <p className="text-xs mt-2 text-muted-foreground">
                            Make sure the backend server is running (agent serve)
                        </p>
                    </CardContent>
                </Card>
            ) : skills.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-10 text-center text-muted-foreground">
                        <Terminal className="mx-auto h-10 w-10 mb-4 opacity-50" />
                        <p>No skills installed yet.</p>
                        <p className="text-sm">Add .md files to the skills/ folder.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {skills.map((skill) => (
                        <Card key={skill.name} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-start">
                                    <span>{skill.name}</span>
                                    <span className="text-xs px-2 py-1 bg-muted rounded-full font-normal text-muted-foreground">
                                        v{skill.version}
                                    </span>
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {skill.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {skill.author && (
                                        <span className="flex items-center gap-1">
                                            by {skill.author}
                                        </span>
                                    )}
                                    {skill.triggers && skill.triggers.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            triggers: {skill.triggers.slice(0, 3).join(', ')}
                                            {skill.triggers.length > 3 && '...'}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t pt-4">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dashboard/skills/${skill.name}`}>
                                        Details
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
