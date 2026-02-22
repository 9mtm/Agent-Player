'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Loader2, TerminalSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SkillRunner({ skillName }: { skillName: string }) {
    const [open, setOpen] = useState(false);
    const [args, setArgs] = useState('');
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<any>(null);

    const handleRun = async () => {
        setRunning(true);
        setOutput(null);
        try {
            const res = await fetch(`/api/skills/${skillName}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    args: args.split(' ').filter(Boolean)
                }),
            });
            const data = await res.json();
            setOutput(data);
        } catch (e) {
            setOutput({ error: 'Failed to run skill' });
        } finally {
            setRunning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Play className="mr-2 h-4 w-4" />
                    Run Skill
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Execute {skillName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Arguments (space separated)</Label>
                        <Input
                            placeholder='e.g. --verbose "some input"'
                            value={args}
                            onChange={e => setArgs(e.target.value)}
                        />
                    </div>

                    <div className="bg-black text-green-500 font-mono text-xs p-4 rounded-md min-h-[300px] max-h-[500px] overflow-auto whitespace-pre-wrap break-all">
                        {!output && !running && <div className="opacity-50">$ Ready via auto-detected runtime...</div>}
                        {running && <div className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Running...</div>}
                        {output && (
                            <>
                                <div className="text-gray-500 mb-2 border-b border-gray-800 pb-2">
                                    $ exit code: {output.exitCode ?? 'error'} {output.durationMs ? `(${output.durationMs}ms)` : ''}
                                </div>
                                {output.stdout && <div>{output.stdout}</div>}
                                {output.stderr && <div className="text-red-400 mt-2">{output.stderr}</div>}
                                {output.error && <div className="text-red-500 font-bold mt-2">{output.error}</div>}
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
                    <Button onClick={handleRun} disabled={running}>
                        {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
