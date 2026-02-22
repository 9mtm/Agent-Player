'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';
import { Globe, Users, MapPin, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface World {
  id: string;
  name: string;
  description: string | null;
  glb_file_id: string | null;
  thumbnail_file_id: string | null;
  is_public: number;
  max_players: number;
  spawn_position: string | null;
  created_at: string;
  user_id: string;
  owner_name?: string;
  glb_url?: string;
  thumbnail_url?: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  useEffect(() => {
    fetchPublicWorlds();
  }, [sortBy]);

  async function fetchPublicWorlds() {
    try {
      setLoading(true);
      const response = await fetch(`${config.backendUrl}/api/multiverse?is_public=1`);

      if (!response.ok) {
        throw new Error('Failed to fetch public worlds');
      }

      const data = await response.json();

      // Sort worlds
      let sorted = [...data.worlds];
      if (sortBy === 'newest') {
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      // TODO: Add 'popular' sort when we have player count tracking

      setWorlds(sorted);
    } catch (error) {
      console.error('Error fetching public worlds:', error);
      toast.error('Failed to load public worlds');
    } finally {
      setLoading(false);
    }
  }

  function handleJoinWorld(world: World) {
    // Navigate to avatar viewer with world ID
    router.push(`/avatar-viewer?world=${world.id}`);
  }

  function getDefaultThumbnail() {
    return '/placeholder-world.png'; // Fallback image
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Explore Public Worlds</h1>
        </div>
        <p className="text-muted-foreground">
          Discover and join public worlds created by users on this instance
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Worlds</p>
              <p className="text-2xl font-bold">{worlds.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Players</p>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">(Coming soon)</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Featured</p>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">(Coming soon)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <button
          onClick={() => setSortBy('newest')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'newest'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Newest
        </button>
        <button
          onClick={() => setSortBy('popular')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'popular'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          disabled
          title="Coming soon when player tracking is implemented"
        >
          Popular (Soon)
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && worlds.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Public Worlds Yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a public world!
          </p>
          <button
            onClick={() => router.push('/dashboard/multiverse')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Create World
          </button>
        </div>
      )}

      {/* Worlds Grid */}
      {!loading && worlds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {worlds.map((world) => (
            <div
              key={world.id}
              className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-muted">
                {world.thumbnail_url ? (
                  <img
                    src={world.thumbnail_url}
                    alt={world.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = getDefaultThumbnail();
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Globe className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {/* Max Players Badge */}
                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>Max {world.max_players}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 truncate">{world.name}</h3>

                {world.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {world.description}
                  </p>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(world.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleJoinWorld(world)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Join World
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      {!loading && worlds.length > 0 && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> These are worlds from your local instance only.
            Cross-instance discovery will be available in v2.0 with the Bridge Server.
          </p>
        </div>
      )}
    </div>
  );
}
