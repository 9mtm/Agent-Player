'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2, Code, Database, GitBranch, Layers, Lock, Mail, MessageSquare, Package, Settings, Sparkles, Users, Video, Zap } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  sections: {
    added?: ChangeItem[];
    changed?: ChangeItem[];
    fixed?: ChangeItem[];
    removed?: ChangeItem[];
  };
}

interface ChangeItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  badges?: string[];
}

const changelogData: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-02-21',
    type: 'minor',
    sections: {
      added: [
        {
          title: 'Agent Files System',
          description: 'File-based PERSONALITY.md and MEMORY.md per agent with frontend editor',
          icon: <Code className="w-5 h-5" />,
          badges: ['Backend', 'Frontend', 'Storage']
        },
        {
          title: 'Calendar System',
          description: 'Complete calendar management with Google Calendar sync and iCal import',
          icon: <Calendar className="w-5 h-5" />,
          badges: ['Feature', 'Integration', 'OAuth2']
        },
        {
          title: 'Email Client Extension',
          description: 'Full-featured email client with multi-account support (optional extension)',
          icon: <Mail className="w-5 h-5" />,
          badges: ['Extension', 'OAuth2', 'FTS5']
        },
        {
          title: 'Database Management',
          description: 'Complete database admin interface with backup/restore and maintenance tools',
          icon: <Database className="w-5 h-5" />,
          badges: ['Admin', 'Tools']
        }
      ],
      changed: [
        {
          title: 'Zero Emojis Policy',
          description: 'Migrated all UI emojis to lucide-react icons (28 files cleaned)',
          icon: <Sparkles className="w-5 h-5" />,
          badges: ['UI/UX', 'Migration']
        },
        {
          title: 'Toast Notifications',
          description: 'Replaced all browser alerts with Sonner toast (110 alerts replaced)',
          icon: <MessageSquare className="w-5 h-5" />,
          badges: ['UI/UX', 'Migration']
        }
      ],
      fixed: [
        {
          title: 'Interactive Worlds',
          description: 'Fixed animation state management and position reset issues',
          icon: <CheckCircle2 className="w-5 h-5" />,
          badges: ['Bug Fix']
        }
      ]
    }
  },
  {
    version: '1.2.0',
    date: '2026-02-20',
    type: 'minor',
    sections: {
      added: [
        {
          title: 'Extension SDK System',
          description: 'Professional plugin architecture (VSCode/WordPress-style)',
          icon: <Package className="w-5 h-5" />,
          badges: ['Architecture', 'SDK', 'Plugins']
        },
        {
          title: 'WAF Security Extension',
          description: 'Complete security scanner extension with 20+ WAF detection',
          icon: <Lock className="w-5 h-5" />,
          badges: ['Extension', 'Security']
        },
        {
          title: 'Interactive Worlds',
          description: '3D environments with physics, character controller, and camera rotation',
          icon: <Layers className="w-5 h-5" />,
          badges: ['3D', 'Physics', 'WebGL']
        }
      ],
      changed: [
        {
          title: 'Extension System',
          description: 'Migrated to pure JavaScript for better compatibility',
          icon: <Code className="w-5 h-5" />,
          badges: ['Migration']
        }
      ],
      fixed: [
        {
          title: 'Extension Imports',
          description: 'Fixed TypeScript syntax errors in extension loading',
          icon: <CheckCircle2 className="w-5 h-5" />,
          badges: ['Bug Fix']
        }
      ]
    }
  },
  {
    version: '1.1.0',
    date: '2026-02-19',
    type: 'minor',
    sections: {
      added: [
        {
          title: 'User Profile System',
          description: 'Complete profile management with JWT authentication',
          icon: <Users className="w-5 h-5" />,
          badges: ['Auth', 'Profile']
        },
        {
          title: 'Notification System',
          description: 'Multi-channel notifications (in-app, email, push, WhatsApp)',
          icon: <MessageSquare className="w-5 h-5" />,
          badges: ['Feature', 'Channels']
        },
        {
          title: 'Camera & WebRTC',
          description: 'Real-time video communication with AI Vision integration',
          icon: <Video className="w-5 h-5" />,
          badges: ['WebRTC', 'AI', 'Video']
        },
        {
          title: 'Local Storage',
          description: 'File management infrastructure with zones and categories',
          icon: <Database className="w-5 h-5" />,
          badges: ['Storage', 'Files']
        }
      ]
    }
  },
  {
    version: '1.0.0',
    date: '2026-02-18',
    type: 'major',
    sections: {
      added: [
        {
          title: 'Multi-Agent Squad System',
          description: 'Complete agent orchestration with cron scheduling and Kanban board',
          icon: <Users className="w-5 h-5" />,
          badges: ['Agents', 'Orchestration']
        },
        {
          title: 'Agentic Tool System',
          description: '18 tools for AI agents with parallel execution',
          icon: <Zap className="w-5 h-5" />,
          badges: ['Tools', 'AI', 'Automation']
        },
        {
          title: 'Avatar Viewer Systems',
          description: '12 FX effects, 10 weather presets, 27 notification types',
          icon: <Sparkles className="w-5 h-5" />,
          badges: ['3D', 'Effects', 'Avatar']
        },
        {
          title: 'ui-web4 Generative UI',
          description: 'In-house UI generation engine with 54 components',
          icon: <Layers className="w-5 h-5" />,
          badges: ['UI', 'Engine', 'Components']
        }
      ],
      changed: [
        {
          title: 'Database Pattern',
          description: 'Switched to getDatabase() pattern for better management',
          icon: <Database className="w-5 h-5" />,
          badges: ['Architecture']
        }
      ],
      fixed: [
        {
          title: 'THREE.js Skinned Mesh',
          description: 'Fixed cloning issues with SkeletonUtils',
          icon: <CheckCircle2 className="w-5 h-5" />,
          badges: ['Bug Fix', '3D']
        }
      ]
    }
  },
  {
    version: '0.9.0',
    date: '2025-07-31',
    type: 'minor',
    sections: {
      added: [
        {
          title: 'Initial Project Structure',
          description: 'Chat components, message handling, and basic agent configuration',
          icon: <GitBranch className="w-5 h-5" />,
          badges: ['Foundation']
        }
      ],
      changed: [
        {
          title: 'Chat Components',
          description: 'Refactored for better modularity and message schema',
          icon: <Code className="w-5 h-5" />,
          badges: ['Refactor']
        }
      ]
    }
  },
  {
    version: '0.5.0',
    date: '2025-07-21',
    type: 'minor',
    sections: {
      added: [
        {
          title: 'Development Environment',
          description: 'Setup with database migrations and health checks',
          icon: <Settings className="w-5 h-5" />,
          badges: ['DevOps']
        }
      ],
      changed: [
        {
          title: 'Code Cleanup',
          description: 'Removed obsolete scripts and deprecated code',
          icon: <Code className="w-5 h-5" />,
          badges: ['Cleanup']
        }
      ],
      fixed: [
        {
          title: 'Agent Creation',
          description: 'Fixed workflow and improved error handling',
          icon: <CheckCircle2 className="w-5 h-5" />,
          badges: ['Bug Fix']
        }
      ]
    }
  },
  {
    version: '0.1.0',
    date: '2025-07-20',
    type: 'patch',
    sections: {
      added: [
        {
          title: 'Initial Release',
          description: 'Core backend (Express), frontend (Next.js), SQLite, authentication',
          icon: <Sparkles className="w-5 h-5" />,
          badges: ['Initial', 'Backend', 'Frontend']
        }
      ]
    }
  }
];

export default function ChangelogPage() {
  const [filter, setFilter] = useState<'all' | 'major' | 'minor' | 'patch'>('all');

  const filteredChangelog = changelogData.filter(
    (entry) => filter === 'all' || entry.type === filter
  );

  const getSectionColor = (section: string) => {
    const colors: Record<string, string> = {
      added: 'text-green-400 bg-green-500/10 border-green-500/20',
      changed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      fixed: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      removed: 'text-red-400 bg-red-500/10 border-red-500/20'
    };
    return colors[section] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  };

  const getVersionBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      major: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      minor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      patch: 'bg-green-500/20 text-green-300 border-green-500/30'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <GitBranch className="w-10 h-10 text-blue-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Development Timeline
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Complete history of features, improvements, and fixes in Agent Player
          </p>

          {/* Version Filter */}
          <div className="flex gap-3 mt-6">
            {(['all', 'major', 'minor', 'patch'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === type
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />

          {/* Timeline Entries */}
          <div className="space-y-12">
            {filteredChangelog.map((entry, entryIndex) => (
              <div key={entry.version} className="relative pl-20">
                {/* Timeline Dot */}
                <div className="absolute left-5 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-4 border-gray-900 shadow-lg shadow-blue-500/50" />

                {/* Entry Card */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all shadow-2xl">
                  {/* Version Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-bold text-white">
                        v{entry.version}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${getVersionBadgeColor(
                          entry.type
                        )}`}
                      >
                        {entry.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{entry.date}</span>
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="space-y-6">
                    {Object.entries(entry.sections).map(([section, items]) => (
                      items && items.length > 0 && (
                        <div key={section}>
                          <h3
                            className={`text-sm font-bold uppercase tracking-wider mb-4 px-3 py-1 rounded-lg inline-block border ${getSectionColor(
                              section
                            )}`}
                          >
                            {section}
                          </h3>
                          <div className="grid gap-4 mt-3">
                            {items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 text-gray-400">{item.icon}</div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-white mb-1">
                                      {item.title}
                                    </h4>
                                    <p className="text-gray-400 text-sm mb-2">
                                      {item.description}
                                    </p>
                                    {item.badges && item.badges.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {item.badges.map((badge, badgeIndex) => (
                                          <span
                                            key={badgeIndex}
                                            className="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded text-xs font-medium border border-gray-600"
                                          >
                                            {badge}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-300 mb-2">
              {changelogData.length}
            </div>
            <div className="text-gray-400 text-sm">Total Versions</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
            <div className="text-3xl font-bold text-blue-300 mb-2">
              {changelogData.filter((e) => e.type === 'major').length}
            </div>
            <div className="text-gray-400 text-sm">Major Releases</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-300 mb-2">
              {changelogData.reduce(
                (acc, e) => acc + (e.sections.added?.length || 0),
                0
              )}
            </div>
            <div className="text-gray-400 text-sm">Features Added</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
            <div className="text-3xl font-bold text-orange-300 mb-2">
              {changelogData.reduce(
                (acc, e) => acc + (e.sections.fixed?.length || 0),
                0
              )}
            </div>
            <div className="text-gray-400 text-sm">Bugs Fixed</div>
          </div>
        </div>

        {/* Project Info */}
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Project Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Version:</span>{' '}
              <span className="text-white font-mono">v1.3.0</span>
            </div>
            <div>
              <span className="text-gray-400">Repository:</span>{' '}
              <a
                href="https://github.com/Dpro-at/AI-Agent-Player"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                AI-Agent-Player
              </a>
            </div>
            <div>
              <span className="text-gray-400">Frontend:</span>{' '}
              <span className="text-white font-mono">http://localhost:41521</span>
            </div>
            <div>
              <span className="text-gray-400">Backend:</span>{' '}
              <span className="text-white font-mono">http://localhost:41522</span>
            </div>
            <div>
              <span className="text-gray-400">Tech Stack:</span>{' '}
              <span className="text-white">Next.js 16, React 19, SQLite, Express</span>
            </div>
            <div>
              <span className="text-gray-400">3D Engine:</span>{' '}
              <span className="text-white">THREE.js, React Three Fiber</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
