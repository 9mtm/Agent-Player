'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Competitors() {
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');

  const addCompetitor = () => {
    if (!newCompetitor) {
      toast.error('Please enter a competitor domain');
      return;
    }

    if (competitors.includes(newCompetitor)) {
      toast.error('Competitor already added');
      return;
    }

    setCompetitors([...competitors, newCompetitor]);
    setNewCompetitor('');
    toast.success('Competitor added');
  };

  const removeCompetitor = (domain: string) => {
    setCompetitors(competitors.filter(c => c !== domain));
    toast.success('Competitor removed');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-purple-500" />
          Competitor Analysis
        </h1>
        <p className="text-muted-foreground mt-1">
          Track and compare your rankings with competitors
        </p>
      </div>

      {/* Add Competitor Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Competitor</CardTitle>
          <CardDescription>
            Enter competitor domains to track their keyword rankings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Competitor Domain</Label>
              <Input
                placeholder="e.g., competitor.com"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addCompetitor}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitors List */}
      {competitors.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tracked Competitors ({competitors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {competitors.map((competitor) => (
                <div
                  key={competitor}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{competitor}</h4>
                      <p className="text-xs text-muted-foreground">
                        No data yet - start tracking keywords to compare
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeCompetitor(competitor)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Competitors Added</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Add competitor domains above to start tracking their rankings and compare with your keywords
            </p>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Competitor Analysis Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <h4 className="font-medium text-sm">Add Competitors</h4>
                <p className="text-xs text-muted-foreground">
                  Enter the domains of your competitors above
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <h4 className="font-medium text-sm">Track Keywords</h4>
                <p className="text-xs text-muted-foreground">
                  When you scrape keywords, the system automatically checks competitor positions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <h4 className="font-medium text-sm">Compare Rankings</h4>
                <p className="text-xs text-muted-foreground">
                  View side-by-side comparisons showing where competitors outrank you
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <h4 className="font-medium text-sm">Get Insights</h4>
                <p className="text-xs text-muted-foreground">
                  Use AI agent: "Compare my rankings with competitor.com" for detailed analysis
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Tool */}
      <Card className="border-purple-500/50 bg-purple-500/10">
        <CardHeader>
          <CardTitle className="text-purple-700 dark:text-purple-400">
            AI Competitor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Use the AI agent for advanced competitor analysis:
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
            "Analyze competitors for example.com and show where they outrank us"
          </code>
          <p className="text-xs text-muted-foreground mt-3">
            The agent will use the <code className="bg-muted px-1 rounded">seo_competitor_analysis</code> tool
            to provide insights and recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
