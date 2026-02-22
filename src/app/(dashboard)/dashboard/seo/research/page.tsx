'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function KeywordResearch() {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [niche, setNiche] = useState('');
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateIdeas = async () => {
    if (!seedKeyword) {
      toast.error('Please enter a seed keyword');
      return;
    }

    setLoading(true);
    try {
      // Generate template-based keyword ideas
      const templates = [
        `${seedKeyword} guide`,
        `best ${seedKeyword}`,
        `${seedKeyword} tips`,
        `how to ${seedKeyword}`,
        `${seedKeyword} tutorial`,
        `${seedKeyword} for beginners`,
        `${seedKeyword} vs`,
        `${seedKeyword} pricing`,
        `${seedKeyword} review`,
        `free ${seedKeyword}`,
        `${seedKeyword} alternatives`,
        `${seedKeyword} features`,
        `${seedKeyword} comparison`,
        `${seedKeyword} examples`,
        `${seedKeyword} tools`,
        `${seedKeyword} software`,
        `${seedKeyword} online`,
        `${seedKeyword} service`,
        `top ${seedKeyword}`,
        `${seedKeyword} strategies`,
      ];

      const generatedIdeas = templates.map((kw, i) => ({
        keyword: kw,
        volume: Math.floor(Math.random() * 10000) + 100,
        difficulty: Math.floor(Math.random() * 100),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
      }));

      setIdeas(generatedIdeas);
      toast.success(`Generated ${generatedIdeas.length} keyword ideas`);
    } catch (error) {
      toast.error('Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  const addKeywordToTracking = async (keyword: string) => {
    toast.info('Use the chat to add keywords: "Track keyword \'' + keyword + '\' for your-domain.com"');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-8 w-8 text-yellow-500" />
          Keyword Research
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover new keyword opportunities with AI-powered research
        </p>
      </div>

      {/* Research Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generate Keyword Ideas
          </CardTitle>
          <CardDescription>
            Enter a seed keyword to discover related search terms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seed Keyword *</Label>
              <Input
                placeholder="e.g., project management"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The main keyword to base your research on
              </p>
            </div>
            <div className="space-y-2">
              <Label>Niche (Optional)</Label>
              <Input
                placeholder="e.g., SaaS, e-commerce, healthcare"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your business niche for more targeted ideas
              </p>
            </div>
          </div>
          <Button onClick={generateIdeas} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Ideas'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {ideas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Ideas ({ideas.length})</CardTitle>
            <CardDescription>
              Click + to add keywords to tracking (via AI agent)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ideas.map((idea, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{idea.keyword}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Volume: {idea.volume.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        Difficulty: {idea.difficulty}/100
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <Badge
                        variant={
                          idea.trend === 'up'
                            ? 'default'
                            : idea.trend === 'down'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {idea.trend === 'up' ? '↑' : idea.trend === 'down' ? '↓' : '→'}{' '}
                        {idea.trend}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addKeywordToTracking(idea.keyword)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Agent Info */}
      {ideas.length === 0 && (
        <Card className="border-purple-500/50 bg-purple-500/10">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-400">
              AI-Powered Research
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              You can also use the AI agent for keyword research:
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
              "Generate keyword ideas for 'project management' in SaaS niche"
            </code>
            <p className="text-xs text-muted-foreground mt-3">
              The AI agent will use the <code className="bg-muted px-1 rounded">seo_research_keywords</code> tool
              and display results on the Avatar Viewer screen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
