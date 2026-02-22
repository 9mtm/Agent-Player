/**
 * Agent Orchestrator
 * Manages agent spawning, task assignment, and coordination
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import {
  type AgentDefinition,
  type AgentInstance,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type TeamDefinition,
  type TeamInstance,
  type OrchestrationStrategy,
  type MultiAgentStats,
  DEFAULT_ORCHESTRATION,
} from './types.js';

export class AgentOrchestrator {
  private db: Database.Database | null = null;
  private agents: Map<string, AgentInstance> = new Map();
  private teams: Map<string, TeamInstance> = new Map();
  private tasks: Map<string, Task> = new Map();
  private strategy: OrchestrationStrategy = DEFAULT_ORCHESTRATION;

  // Limits
  private maxSpawnDepth: number = 3;
  private maxChildrenPerAgent: number = 5;
  private maxConcurrentTasks: number = 10;

  /**
   * Initialize the orchestrator
   */
  async initialize(dbPath: string = './.data/multi-agent/orchestrator.db'): Promise<void> {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.createTables();
    this.loadFromDatabase();

    console.log('[Orchestrator] Initialized');
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        role TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        model TEXT,
        system_prompt TEXT,
        max_concurrent_tasks INTEGER DEFAULT 3,
        metadata TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        objective TEXT NOT NULL,
        agent_ids TEXT NOT NULL,
        leader_id TEXT,
        communication_style TEXT DEFAULT 'flat',
        shared_memory INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'pending',
        required_capabilities TEXT,
        assigned_to TEXT,
        team_id TEXT,
        parent_id TEXT,
        subtasks TEXT,
        dependencies TEXT,
        input TEXT,
        output TEXT,
        progress INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        deadline TEXT,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 2,
        spawn_depth INTEGER DEFAULT 0,
        spawned_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
    `);
  }

  /**
   * Load data from database
   */
  private loadFromDatabase(): void {
    // Load agents
    const agentRows = this.db!.prepare('SELECT * FROM agents').all() as any[];
    for (const row of agentRows) {
      const definition: AgentDefinition = {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        role: row.role,
        capabilities: JSON.parse(row.capabilities),
        model: row.model || undefined,
        systemPrompt: row.system_prompt || undefined,
        maxConcurrentTasks: row.max_concurrent_tasks,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };

      this.agents.set(row.id, {
        definition,
        status: 'idle',
        currentTasks: [],
        completedTasks: 0,
        failedTasks: 0,
        memory: { shortTerm: [], longTerm: [] },
      });
    }

    // Load teams
    const teamRows = this.db!.prepare('SELECT * FROM teams').all() as any[];
    for (const row of teamRows) {
      const definition: TeamDefinition = {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        objective: row.objective,
        agentIds: JSON.parse(row.agent_ids),
        leaderId: row.leader_id || undefined,
        communicationStyle: row.communication_style,
        sharedMemory: row.shared_memory === 1,
        createdAt: new Date(row.created_at),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };

      this.teams.set(row.id, {
        definition,
        status: row.status,
        activeTasks: [],
        completedTasks: 0,
        sharedMemory: [],
        messageHistory: [],
      });
    }

    // Load pending tasks
    const taskRows = this.db!.prepare(
      "SELECT * FROM tasks WHERE status NOT IN ('completed', 'failed', 'cancelled')"
    ).all() as any[];
    for (const row of taskRows) {
      this.tasks.set(row.id, this.rowToTask(row));
    }
  }

  // ============ Agent Management ============

  /**
   * Register a new agent
   */
  registerAgent(definition: AgentDefinition): AgentInstance {
    const instance: AgentInstance = {
      definition,
      status: 'idle',
      currentTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      memory: { shortTerm: [], longTerm: [] },
    };

    this.agents.set(definition.id, instance);

    // Persist
    this.db!.prepare(`
      INSERT OR REPLACE INTO agents (
        id, name, description, role, capabilities, model,
        system_prompt, max_concurrent_tasks, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      definition.id,
      definition.name,
      definition.description || null,
      definition.role,
      JSON.stringify(definition.capabilities),
      definition.model || null,
      definition.systemPrompt || null,
      definition.maxConcurrentTasks,
      definition.metadata ? JSON.stringify(definition.metadata) : null,
      new Date().toISOString()
    );

    console.log(`[Orchestrator] Registered agent: ${definition.name} (${definition.id})`);
    return instance;
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentInstance | undefined {
    return this.agents.get(id);
  }

  /**
   * List all agents
   */
  listAgents(filter?: { role?: string; status?: string }): AgentInstance[] {
    let agents = Array.from(this.agents.values());

    if (filter?.role) {
      agents = agents.filter((a) => a.definition.role === filter.role);
    }
    if (filter?.status) {
      agents = agents.filter((a) => a.status === filter.status);
    }

    return agents;
  }

  /**
   * Find agents with specific capabilities
   */
  findAgentsByCapability(capabilities: string[]): AgentInstance[] {
    return Array.from(this.agents.values()).filter((agent) =>
      capabilities.every((cap) =>
        agent.definition.capabilities.some(
          (agentCap) => agentCap.toLowerCase() === cap.toLowerCase()
        )
      )
    );
  }

  /**
   * Update agent status
   */
  updateAgentStatus(id: string, status: AgentInstance['status']): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastActivity = new Date();
    }
  }

  /**
   * Remove agent
   */
  removeAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (deleted) {
      this.db!.prepare('DELETE FROM agents WHERE id = ?').run(id);
    }
    return deleted;
  }

  // ============ Team Management ============

  /**
   * Create a team
   */
  createTeam(definition: Omit<TeamDefinition, 'id' | 'createdAt'>): TeamInstance {
    const id = `team_${uuidv4()}`;
    const now = new Date();

    const fullDefinition: TeamDefinition = {
      ...definition,
      id,
      createdAt: now,
    };

    const instance: TeamInstance = {
      definition: fullDefinition,
      status: 'active',
      activeTasks: [],
      completedTasks: 0,
      sharedMemory: [],
      messageHistory: [],
    };

    this.teams.set(id, instance);

    // Update agent team membership
    for (const agentId of definition.agentIds) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.teamId = id;
      }
    }

    // Persist
    this.db!.prepare(`
      INSERT INTO teams (
        id, name, description, objective, agent_ids, leader_id,
        communication_style, shared_memory, status, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fullDefinition.id,
      fullDefinition.name,
      fullDefinition.description || null,
      fullDefinition.objective,
      JSON.stringify(fullDefinition.agentIds),
      fullDefinition.leaderId || null,
      fullDefinition.communicationStyle,
      fullDefinition.sharedMemory ? 1 : 0,
      'active',
      fullDefinition.createdAt.toISOString(),
      fullDefinition.metadata ? JSON.stringify(fullDefinition.metadata) : null
    );

    console.log(`[Orchestrator] Created team: ${fullDefinition.name} (${id})`);
    return instance;
  }

  /**
   * Get team by ID
   */
  getTeam(id: string): TeamInstance | undefined {
    return this.teams.get(id);
  }

  /**
   * List all teams
   */
  listTeams(): TeamInstance[] {
    return Array.from(this.teams.values());
  }

  /**
   * Disband team
   */
  disbandTeam(id: string): boolean {
    const team = this.teams.get(id);
    if (!team) return false;

    team.status = 'disbanded';

    // Remove team from agents
    for (const agentId of team.definition.agentIds) {
      const agent = this.agents.get(agentId);
      if (agent && agent.teamId === id) {
        agent.teamId = undefined;
      }
    }

    this.db!.prepare("UPDATE teams SET status = 'disbanded' WHERE id = ?").run(id);
    return true;
  }

  // ============ Task Management ============

  /**
   * Create a task
   */
  createTask(input: {
    title: string;
    description: string;
    priority?: TaskPriority;
    requiredCapabilities?: string[];
    teamId?: string;
    parentId?: string;
    dependencies?: string[];
    inputData?: Record<string, unknown>;
    deadline?: Date;
    maxRetries?: number;
    spawnedBy?: string;
  }): Task {
    const id = `task_${uuidv4()}`;
    const now = new Date();

    // Calculate spawn depth
    let spawnDepth = 0;
    if (input.parentId) {
      const parent = this.tasks.get(input.parentId);
      if (parent) {
        spawnDepth = (parent as any).spawnDepth + 1;
      }
    }

    // Check depth limit
    if (spawnDepth > this.maxSpawnDepth) {
      throw new Error(`Max spawn depth exceeded (${spawnDepth} > ${this.maxSpawnDepth})`);
    }

    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      priority: input.priority || 'normal',
      status: 'pending',
      requiredCapabilities: input.requiredCapabilities,
      teamId: input.teamId,
      parentId: input.parentId,
      subtasks: [],
      dependencies: input.dependencies,
      input: input.inputData,
      progress: 0,
      createdAt: now,
      deadline: input.deadline,
      retryCount: 0,
      maxRetries: input.maxRetries ?? 2,
    };

    // Add spawn metadata
    (task as any).spawnDepth = spawnDepth;
    (task as any).spawnedBy = input.spawnedBy;

    this.tasks.set(id, task);

    // Add to parent's subtasks
    if (input.parentId) {
      const parent = this.tasks.get(input.parentId);
      if (parent && parent.subtasks) {
        parent.subtasks.push(id);
      }
    }

    // Persist
    this.persistTask(task);

    console.log(`[Orchestrator] Created task: ${task.title} (${id})`);
    return task;
  }

  /**
   * Spawn a subtask
   */
  spawnSubtask(
    parentTaskId: string,
    input: {
      title: string;
      description: string;
      agentId?: string;
      priority?: TaskPriority;
    }
  ): Task | null {
    const parentTask = this.tasks.get(parentTaskId);
    if (!parentTask) return null;

    // Check children limit
    const childCount = parentTask.subtasks?.length || 0;
    if (childCount >= this.maxChildrenPerAgent) {
      throw new Error(`Max children per agent exceeded (${childCount} >= ${this.maxChildrenPerAgent})`);
    }

    return this.createTask({
      title: input.title,
      description: input.description,
      priority: input.priority || parentTask.priority,
      teamId: parentTask.teamId,
      parentId: parentTaskId,
      spawnedBy: parentTask.assignedTo,
    });
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) return false;

    // Check if agent can take more tasks
    if (agent.currentTasks.length >= agent.definition.maxConcurrentTasks) {
      return false;
    }

    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const allDepsComplete = task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });
      if (!allDepsComplete) {
        return false;
      }
    }

    task.assignedTo = agentId;
    task.status = 'assigned';
    agent.currentTasks.push(taskId);
    agent.status = 'busy';

    this.persistTask(task);
    return true;
  }

  /**
   * Auto-assign task based on strategy
   */
  autoAssignTask(taskId: string): string | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    let candidates: AgentInstance[] = [];

    // Get team agents if team task
    if (task.teamId) {
      const team = this.teams.get(task.teamId);
      if (team) {
        candidates = team.definition.agentIds
          .map((id) => this.agents.get(id))
          .filter((a): a is AgentInstance => a !== undefined);
      }
    } else {
      candidates = Array.from(this.agents.values());
    }

    // Filter by capabilities
    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      candidates = candidates.filter((agent) =>
        task.requiredCapabilities!.every((cap) =>
          agent.definition.capabilities.includes(cap)
        )
      );
    }

    // Filter by availability
    candidates = candidates.filter(
      (a) => a.currentTasks.length < a.definition.maxConcurrentTasks
    );

    if (candidates.length === 0) return null;

    // Select based on strategy
    let selected: AgentInstance;

    switch (this.strategy.assignmentMode) {
      case 'round_robin':
        // Sort by task count, pick lowest
        candidates.sort((a, b) => a.currentTasks.length - b.currentTasks.length);
        selected = candidates[0];
        break;

      case 'load_balance':
        // Weight by completed/failed ratio and current load
        candidates.sort((a, b) => {
          const scoreA = a.currentTasks.length * 10 - a.completedTasks + a.failedTasks * 2;
          const scoreB = b.currentTasks.length * 10 - b.completedTasks + b.failedTasks * 2;
          return scoreA - scoreB;
        });
        selected = candidates[0];
        break;

      case 'capability_match':
      default:
        // Prefer agents with more matching capabilities
        if (task.requiredCapabilities) {
          candidates.sort((a, b) => {
            const matchA = a.definition.capabilities.filter((c) =>
              task.requiredCapabilities!.includes(c)
            ).length;
            const matchB = b.definition.capabilities.filter((c) =>
              task.requiredCapabilities!.includes(c)
            ).length;
            return matchB - matchA;
          });
        }
        selected = candidates[0];
        break;
    }

    if (this.assignTask(taskId, selected.definition.id)) {
      return selected.definition.id;
    }

    return null;
  }

  /**
   * Start task execution
   */
  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'assigned') return false;

    task.status = 'in_progress';
    task.startedAt = new Date();

    this.persistTask(task);
    return true;
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: number, output?: Record<string, unknown>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = Math.min(100, Math.max(0, progress));
    if (output) {
      task.output = { ...task.output, ...output };
    }

    this.persistTask(task);
  }

  /**
   * Complete task
   */
  completeTask(taskId: string, output?: Record<string, unknown>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'completed';
    task.progress = 100;
    task.completedAt = new Date();
    if (output) {
      task.output = output;
    }

    // Update agent
    if (task.assignedTo) {
      const agent = this.agents.get(task.assignedTo);
      if (agent) {
        agent.currentTasks = agent.currentTasks.filter((id) => id !== taskId);
        agent.completedTasks++;
        if (agent.currentTasks.length === 0) {
          agent.status = 'idle';
        }
      }
    }

    this.persistTask(task);

    // Check if parent task should be updated
    this.checkParentTaskCompletion(task.parentId);

    // Propagate output to dependent tasks (pipeline chaining)
    if (output) {
      this.propagatePipelineOutput(taskId, output);
    }

    return true;
  }

  /**
   * Propagate completed task output into dependent tasks' input (_upstream key).
   * This enables Task A → Task B → Task C pipelines where each task receives
   * the previous task's output automatically.
   */
  private propagatePipelineOutput(completedTaskId: string, output: Record<string, unknown>): void {
    for (const [, task] of this.tasks) {
      if (task.status !== 'pending') continue;
      if (!task.dependencies?.includes(completedTaskId)) continue;

      const existing: Record<string, unknown> = task.input ? JSON.parse(JSON.stringify(task.input)) : {};
      const upstream = (existing._upstream as Record<string, unknown>) ?? {};
      upstream[completedTaskId] = output;
      existing._upstream = upstream;
      task.input = existing;

      this.persistTask(task);
    }
  }

  /**
   * Fail task
   */
  failTask(taskId: string, error: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Check for retry
    if (this.strategy.autoRetry && task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = 'pending';
      task.assignedTo = undefined;
      task.error = error;

      // Update agent
      if (task.assignedTo) {
        const agent = this.agents.get(task.assignedTo);
        if (agent) {
          agent.currentTasks = agent.currentTasks.filter((id) => id !== taskId);
          if (agent.currentTasks.length === 0) {
            agent.status = 'idle';
          }
        }
      }

      this.persistTask(task);

      // Auto-reassign
      setTimeout(() => this.autoAssignTask(taskId), 1000);
      return true;
    }

    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();

    // Update agent
    if (task.assignedTo) {
      const agent = this.agents.get(task.assignedTo);
      if (agent) {
        agent.currentTasks = agent.currentTasks.filter((id) => id !== taskId);
        agent.failedTasks++;
        if (agent.currentTasks.length === 0) {
          agent.status = 'idle';
        }
      }
    }

    this.persistTask(task);
    return false;
  }

  /**
   * Check if parent task should be marked complete
   */
  private checkParentTaskCompletion(parentId?: string): void {
    if (!parentId) return;

    const parent = this.tasks.get(parentId);
    if (!parent || !parent.subtasks || parent.subtasks.length === 0) return;

    const allComplete = parent.subtasks.every((id) => {
      const subtask = this.tasks.get(id);
      return subtask && subtask.status === 'completed';
    });

    if (allComplete) {
      // Aggregate subtask outputs
      const aggregatedOutput: Record<string, unknown> = {};
      for (const subtaskId of parent.subtasks) {
        const subtask = this.tasks.get(subtaskId);
        if (subtask?.output) {
          aggregatedOutput[subtaskId] = subtask.output;
        }
      }

      this.completeTask(parentId, { subtaskResults: aggregatedOutput });
    }
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * List tasks
   */
  listTasks(filter?: {
    status?: TaskStatus;
    assignedTo?: string;
    teamId?: string;
    limit?: number;
  }): Task[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.assignedTo) {
      tasks = tasks.filter((t) => t.assignedTo === filter.assignedTo);
    }
    if (filter?.teamId) {
      tasks = tasks.filter((t) => t.teamId === filter.teamId);
    }

    // Sort by priority and creation
    tasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    if (filter?.limit) {
      tasks = tasks.slice(0, filter.limit);
    }

    return tasks;
  }

  /**
   * Get child tasks count for an agent
   */
  getActiveChildrenCount(agentId: string): number {
    return Array.from(this.tasks.values()).filter(
      (t) =>
        (t as any).spawnedBy === agentId &&
        !['completed', 'failed', 'cancelled'].includes(t.status)
    ).length;
  }

  // ============ Statistics ============

  /**
   * Get orchestrator statistics
   */
  getStats(): MultiAgentStats {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const allTasks = Array.from(this.tasks.values());
    const recentCompleted = allTasks.filter(
      (t) => t.status === 'completed' && t.completedAt && t.completedAt.getTime() > oneDayAgo
    );
    const recentFailed = allTasks.filter(
      (t) => t.status === 'failed' && t.completedAt && t.completedAt.getTime() > oneDayAgo
    );

    // Calculate average duration
    let totalDuration = 0;
    let durationCount = 0;
    for (const task of recentCompleted) {
      if (task.startedAt && task.completedAt) {
        totalDuration += task.completedAt.getTime() - task.startedAt.getTime();
        durationCount++;
      }
    }

    return {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter((a) => a.status === 'busy').length,
      totalTeams: this.teams.size,
      activeTeams: Array.from(this.teams.values()).filter((t) => t.status === 'active').length,
      tasksCompleted24h: recentCompleted.length,
      tasksFailed24h: recentFailed.length,
      avgTaskDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      messagesExchanged24h: 0, // Will be updated by message system
    };
  }

  // ============ Persistence ============

  private persistTask(task: Task): void {
    this.db!.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, title, description, priority, status, required_capabilities,
        assigned_to, team_id, parent_id, subtasks, dependencies, input, output,
        progress, created_at, started_at, completed_at, deadline, error,
        retry_count, max_retries, spawn_depth, spawned_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id,
      task.title,
      task.description,
      task.priority,
      task.status,
      task.requiredCapabilities ? JSON.stringify(task.requiredCapabilities) : null,
      task.assignedTo || null,
      task.teamId || null,
      task.parentId || null,
      task.subtasks ? JSON.stringify(task.subtasks) : null,
      task.dependencies ? JSON.stringify(task.dependencies) : null,
      task.input ? JSON.stringify(task.input) : null,
      task.output ? JSON.stringify(task.output) : null,
      task.progress,
      task.createdAt.toISOString(),
      task.startedAt?.toISOString() || null,
      task.completedAt?.toISOString() || null,
      task.deadline?.toISOString() || null,
      task.error || null,
      task.retryCount,
      task.maxRetries,
      (task as any).spawnDepth || 0,
      (task as any).spawnedBy || null
    );
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      requiredCapabilities: row.required_capabilities ? JSON.parse(row.required_capabilities) : undefined,
      assignedTo: row.assigned_to || undefined,
      teamId: row.team_id || undefined,
      parentId: row.parent_id || undefined,
      subtasks: row.subtasks ? JSON.parse(row.subtasks) : [],
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
      input: row.input ? JSON.parse(row.input) : undefined,
      output: row.output ? JSON.parse(row.output) : undefined,
      progress: row.progress,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      error: row.error || undefined,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
    };
  }

  /**
   * Update orchestration strategy
   */
  setStrategy(strategy: Partial<OrchestrationStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * Get current strategy
   */
  getStrategy(): OrchestrationStrategy {
    return { ...this.strategy };
  }

  /**
   * Close database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton
let orchestrator: AgentOrchestrator | null = null;

export function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}
