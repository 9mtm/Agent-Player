/**
 * Skills Database - Simple file-based storage
 * Temporary solution until backend skills API is ready
 */

import fs from 'fs';
import path from 'path';

const SKILLS_DB_PATH = path.join(process.cwd(), 'data', 'skills.json');

export interface SkillRecord {
  id: string;
  name: string;
  author: string;
  version: string;
  description?: string;
  path: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
}

interface SkillsData {
  skills: SkillRecord[];
}

function ensureDataDir() {
  const dir = path.dirname(SKILLS_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSkillsData(): SkillsData {
  ensureDataDir();
  if (!fs.existsSync(SKILLS_DB_PATH)) {
    return { skills: [] };
  }
  try {
    const data = fs.readFileSync(SKILLS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { skills: [] };
  }
}

function writeSkillsData(data: SkillsData) {
  ensureDataDir();
  fs.writeFileSync(SKILLS_DB_PATH, JSON.stringify(data, null, 2));
}

export const skillsDb = {
  findMany(): SkillRecord[] {
    return readSkillsData().skills;
  },

  findUnique(where: { name: string }): SkillRecord | null {
    const data = readSkillsData();
    return data.skills.find(s => s.name === where.name) || null;
  },

  create(skill: Omit<SkillRecord, 'id' | 'installedAt' | 'updatedAt'>): SkillRecord {
    const data = readSkillsData();
    const now = new Date().toISOString();
    const newSkill: SkillRecord = {
      ...skill,
      id: `skill-${Date.now()}`,
      installedAt: now,
      updatedAt: now,
    };
    data.skills.push(newSkill);
    writeSkillsData(data);
    return newSkill;
  },

  update(where: { name: string }, updates: Partial<SkillRecord>): SkillRecord | null {
    const data = readSkillsData();
    const index = data.skills.findIndex(s => s.name === where.name);
    if (index === -1) return null;

    data.skills[index] = {
      ...data.skills[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeSkillsData(data);
    return data.skills[index];
  },

  delete(where: { name: string }): SkillRecord | null {
    const data = readSkillsData();
    const index = data.skills.findIndex(s => s.name === where.name);
    if (index === -1) return null;

    const [deleted] = data.skills.splice(index, 1);
    writeSkillsData(data);
    return deleted;
  },

  upsert(where: { name: string }, create: Omit<SkillRecord, 'id' | 'installedAt' | 'updatedAt'>, update: Partial<SkillRecord>): SkillRecord {
    const existing = this.findUnique(where);
    if (existing) {
      return this.update(where, update)!;
    }
    return this.create(create);
  }
};
