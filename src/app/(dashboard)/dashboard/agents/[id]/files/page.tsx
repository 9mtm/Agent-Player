'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Save, FileText, Brain, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

interface AgentFiles {
  personality: string;
  memory: string;
  knowledgeFiles: string[];
}

export default function AgentFilesPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [activeTab, setActiveTab] = useState<'personality' | 'memory' | 'knowledge'>('personality');
  const [personality, setPersonality] = useState('');
  const [memory, setMemory] = useState('');
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string | null>(null);
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [agentId]);

  const loadFiles = async () => {
    try {
      setLoading(true);

      // Load all files
      const res = await fetch(`${config.backendUrl}/api/agents/${agentId}/files`);
      const data = await res.json();

      if (data.success) {
        setPersonality(data.personality);
        setMemory(data.memory);
        setKnowledgeFiles(data.knowledgeFiles || []);
      }
    } catch (err) {
      console.error('Failed to load agent files:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePersonality = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${config.backendUrl}/api/agents/${agentId}/personality`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: personality })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Personality saved successfully!');
      }
    } catch (err) {
      toast.error('Failed to save personality');
    } finally {
      setSaving(false);
    }
  };

  const saveMemory = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${config.backendUrl}/api/agents/${agentId}/memory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memory })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Memory saved successfully!');
      }
    } catch (err) {
      toast.error('Failed to save memory');
    } finally {
      setSaving(false);
    }
  };

  const loadKnowledgeFile = async (filename: string) => {
    try {
      const res = await fetch(`${config.backendUrl}/api/agents/${agentId}/knowledge/${filename}`);
      const data = await res.json();

      if (data.success) {
        setSelectedKnowledge(filename);
        setKnowledgeContent(data.content);
      }
    } catch (err) {
      toast.error('Failed to load knowledge file');
    }
  };

  const saveKnowledgeFile = async () => {
    if (!selectedKnowledge) return;

    try {
      setSaving(true);
      const res = await fetch(`${config.backendUrl}/api/agents/${agentId}/knowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedKnowledge,
          content: knowledgeContent
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Knowledge file saved successfully!');
        loadFiles();
      }
    } catch (err) {
      toast.error('Failed to save knowledge file');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading agent files...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Agent Files</h1>
          <p className="text-gray-400">Manage personality, memory, and knowledge files for this agent</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('personality')}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'personality'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText size={18} />
            PERSONALITY.md
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'memory'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Brain size={18} />
            MEMORY.md
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderOpen size={18} />
            Knowledge ({knowledgeFiles.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'personality' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Agent Personality</h2>
              <button
                onClick={savePersonality}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full h-[600px] bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
              placeholder="Define your agent's personality, behavior, and rules..."
            />
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Agent Memory</h2>
              <button
                onClick={saveMemory}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="w-full h-[600px] bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-purple-500"
              placeholder="Record learned patterns, user preferences, and project context..."
            />
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Files</h3>
                <button className="text-green-400 hover:text-green-300">
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-2">
                {knowledgeFiles.map((file) => (
                  <button
                    key={file}
                    onClick={() => loadKnowledgeFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedKnowledge === file
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-sm truncate">{file}</div>
                  </button>
                ))}
                {knowledgeFiles.length === 0 && (
                  <div className="text-gray-500 text-sm text-center py-8">
                    No knowledge files yet
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-3 space-y-4">
              {selectedKnowledge ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{selectedKnowledge}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={saveKnowledgeFile}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                        <Trash2 size={18} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={knowledgeContent}
                    onChange={(e) => setKnowledgeContent(e.target.value)}
                    className="w-full h-[600px] bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-green-500"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-[600px] bg-gray-900 border border-gray-800 rounded-lg text-gray-500">
                  Select a file or create a new one
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
