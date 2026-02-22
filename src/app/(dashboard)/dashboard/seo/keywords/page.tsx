'use client';

import { config } from '@/lib/config';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Keywords() {
  const [domains, setDomains] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    device: 'desktop',
    country: 'US',
  });

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadKeywords(selectedDomain);
    }
  }, [selectedDomain]);

  const loadDomains = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/ext/seo/domains', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains);
        if (data.domains.length > 0 && !selectedDomain) {
          setSelectedDomain(data.domains[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKeywords = async (domainId: string) => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(
        `${config.backendUrl}/api/ext/seo/keywords?domain_id=${domainId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.keywords);
      }
    } catch (error) {
      console.error('Failed to load keywords:', error);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.keyword || !selectedDomain) {
      toast.error('Please enter a keyword');
      return;
    }

    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/ext/seo/keywords', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain_id: selectedDomain,
          ...newKeyword,
        }),
      });

      if (response.ok) {
        toast.success('Keyword added! Starting initial scrape...');
        setShowAddForm(false);
        setNewKeyword({ keyword: '', device: 'desktop', country: 'US' });
        loadKeywords(selectedDomain);

        // Trigger scrape
        const data = await response.json();
        await scrapeKeyword(data.keyword.id);
      } else {
        throw new Error('Failed to add keyword');
      }
    } catch (error) {
      toast.error('Failed to add keyword');
    }
  };

  const scrapeKeyword = async (keywordId: string) => {
    try {
      const authToken = localStorage.getItem('auth_token');
      await fetch(`${config.backendUrl}/api/ext/seo/scrape/${keywordId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
    } catch (error) {
      console.error('Failed to scrape keyword:', error);
    }
  };

  const deleteKeyword = async (keywordId: string) => {
    if (!confirm('Delete this keyword?')) return;

    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(`${config.backendUrl}/api/ext/seo/keywords/${keywordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        toast.success('Keyword deleted');
        loadKeywords(selectedDomain);
      }
    } catch (error) {
      toast.error('Failed to delete keyword');
    }
  };

  const getPositionBadge = (position: number, history: any) => {
    if (position === 0) {
      return <Badge variant="secondary">&gt;100</Badge>;
    }

    const historyData = JSON.parse(history || '[]');
    const previousPos = historyData.length > 1 ? historyData[historyData.length - 2]?.position : null;

    let variant: any = 'default';
    let icon = <Minus className="h-3 w-3" />;

    if (previousPos && position < previousPos) {
      variant = 'default';
      icon = <ArrowUp className="h-3 w-3 text-green-500" />;
    } else if (previousPos && position > previousPos) {
      variant = 'destructive';
      icon = <ArrowDown className="h-3 w-3 text-red-500" />;
    }

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        #{position}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Domains Found</CardTitle>
            <CardDescription>
              Create a domain first to start tracking keywords
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use the AI agent to create your first domain:
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              "Track keyword 'best CRM software' for example.com"
            </code>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            Keywords
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and monitor keyword rankings
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Keyword
        </Button>
      </div>

      {/* Domain Selector */}
      <div className="flex gap-2">
        {domains.map(domain => (
          <Button
            key={domain.id}
            variant={selectedDomain === domain.id ? 'default' : 'outline'}
            onClick={() => setSelectedDomain(domain.id)}
          >
            {domain.domain}
            <Badge variant="secondary" className="ml-2">
              {domain.keyword_count || 0}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Add Keyword Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Keyword</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Keyword</Label>
                <Input
                  placeholder="e.g., best CRM software"
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Device</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={newKeyword.device}
                  onChange={(e) => setNewKeyword({ ...newKeyword, device: e.target.value })}
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={newKeyword.country}
                  onChange={(e) => setNewKeyword({ ...newKeyword, country: e.target.value })}
                >
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addKeyword}>Add Keyword</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked Keywords ({keywords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No keywords yet. Add your first keyword to start tracking.
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map(kw => (
                <div
                  key={kw.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{kw.keyword}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {kw.device}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {kw.country}
                      </Badge>
                      {kw.last_updated && (
                        <span className="text-xs text-muted-foreground">
                          Updated: {new Date(kw.last_updated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getPositionBadge(kw.position, kw.history)}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => scrapeKeyword(kw.id)}
                        disabled={kw.updating}
                      >
                        <RefreshCw className={`h-4 w-4 ${kw.updating ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteKeyword(kw.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
