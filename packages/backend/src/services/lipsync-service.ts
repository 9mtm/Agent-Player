/**
 * Lipsync Service
 * Runs Rhubarb Lip-Sync CLI on a WAV/MP3 file and returns mouth cues.
 * Soft-dependency: if rhubarb binary is not found, returns null (graceful fallback).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

export interface MouthCue {
  start: number;
  end: number;
  value: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';
}

export interface LipsyncResult {
  metadata: { soundFile: string; duration: number };
  mouthCues: MouthCue[];
}

// Locate rhubarb binary — check beside this file and under the backend root
function findRhubarbBinary(): string | null {
  const cwd = process.cwd(); // typically packages/backend when running pnpm dev
  const candidates = [
    // Direct in rhubarb/ subdirectory (most common)
    path.join(cwd, 'rhubarb', 'rhubarb.exe'),
    path.join(cwd, 'rhubarb', 'rhubarb'),
    // Beside the executable on Linux/Mac
    path.join(cwd, 'rhubarb', 'Rhubarb-Lip-Sync-1.14.0-Windows', 'rhubarb.exe'),
    // Workspace root (if cwd is monorepo root)
    path.join(cwd, 'packages', 'backend', 'rhubarb', 'rhubarb.exe'),
    path.join(cwd, 'packages', 'backend', 'rhubarb', 'rhubarb'),
    // System PATH fallback
    'rhubarb',
  ];
  for (const p of candidates) {
    if (p === 'rhubarb') continue; // skip bare name for fs.existsSync
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let _binaryPath: string | null | undefined = undefined; // undefined = not checked yet

export function isRhubarbAvailable(): boolean {
  if (_binaryPath === undefined) {
    _binaryPath = findRhubarbBinary();
    if (_binaryPath) {
      console.log(`[Lipsync] Rhubarb found at: ${_binaryPath}`);
    } else {
      console.log('[Lipsync] Rhubarb not found — using procedural lip sync fallback');
    }
  }
  return _binaryPath !== null;
}

/**
 * Generate mouth cues from an audio file.
 * @param audioPath Absolute path to WAV or MP3 file
 * @returns MouthCue[] or null if Rhubarb is not available
 */
export async function generateLipsync(audioPath: string): Promise<MouthCue[] | null> {
  if (!isRhubarbAvailable() || !_binaryPath) return null;

  try {
    const { stdout } = await execFileAsync(
      _binaryPath,
      [
        '-f', 'json',           // JSON output
        '--machineReadable',    // cleaner output
        '-r', 'phonetic',       // phonetic recognizer (no dialog file needed)
        audioPath,
      ],
      { timeout: 30_000 },
    );

    const parsed: LipsyncResult = JSON.parse(stdout);
    return parsed.mouthCues ?? null;
  } catch (err) {
    console.error('[Lipsync] Rhubarb error:', err);
    return null;
  }
}
