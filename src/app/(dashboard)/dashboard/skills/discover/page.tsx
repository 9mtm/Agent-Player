'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Download, Check, User, Filter, Tag } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function DiscoverSkillsPage() {
    const router = useRouter();
    const [allSkills, setAllSkills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Derived Categories
    const categories = useMemo(() => {
        const cats = new Set<string>(['All']);
        allSkills.forEach(s => {
            if (s.category && s.category !== 'Uncategorized') cats.add(s.category);
        });
        // Always ensure Uncategorized is at the end if exists, or handled separately
        return Array.from(cats).sort();
    }, [allSkills]);

    // Filtered Skills
    const filteredSkills = useMemo(() => {
        return allSkills.filter(skill => {
            const matchesSearch =
                skill.name.toLowerCase().includes(search.toLowerCase()) ||
                skill.description.toLowerCase().includes(search.toLowerCase()) ||
                skill.author.toLowerCase().includes(search.toLowerCase()) ||
                (skill.tags && skill.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())));

            const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [allSkills, search, selectedCategory]);

    // Load ALL skills on mount
    useEffect(() => {
        fetch('/api/repo/skills')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAllSkills(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleInstall = async (skill: any) => {
        setInstalling(skill.name);
        try {
            const res = await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderPath: skill.localPath,
                    author: skill.author
                })
            });

            if (res.ok) {
                // Update UI locally
                setAllSkills(prev => prev.map(s =>
                    s.name === skill.name ? { ...s, isInstalled: true } : s
                ));
            } else {
                toast.error('Failed to install skill');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error installing skill');
        } finally {
            setInstalling(null);
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Discover Skills</h1>
                <p className="text-muted-foreground">Explore, search, and install capabilities for your agent.</p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search skills, authors, tags..."
                    className="pl-10 h-12 text-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* Sidebar Categories */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 pb-10 hidden md:flex">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Categories
                    </h3>
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? "secondary" : "ghost"}
                            className="justify-start h-9"
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                            {cat === 'All' && <Badge variant="secondary" className="ml-auto text-xs">{allSkills.length}</Badge>}
                        </Button>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="flex-1 overflow-y-auto pb-10 pr-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredSkills.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-medium">No skills found</h3>
                            <p>Try adjusting your search or category filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredSkills.map(skill => (
                                <Card key={skill.name + skill.author} className="flex flex-col h-full hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="font-normal text-xs flex items-center gap-1 opacity-70">
                                                <User className="h-3 w-3" /> {skill.author}
                                            </Badge>
                                            {skill.isInstalled && (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                                                    Installed
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-xl leading-tight">{skill.title || skill.name}</CardTitle>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {skill.category && skill.category !== 'Uncategorized' && (
                                                <Badge variant="secondary" className="text-[10px] h-5">{skill.category}</Badge>
                                            )}
                                            {skill.tags?.slice(0, 3).map((tag: string) => (
                                                <Badge key={tag} variant="outline" className="text-[10px] h-5 opacity-80">#{tag}</Badge>
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {skill.description}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        {skill.isInstalled ? (
                                            <Button variant="outline" className="w-full" disabled>
                                                <Check className="mr-2 h-4 w-4" /> Installed
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full"
                                                onClick={() => handleInstall(skill)}
                                                disabled={installing === skill.name}
                                            >
                                                {installing === skill.name ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="mr-2 h-4 w-4" />
                                                )}
                                                Install
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
