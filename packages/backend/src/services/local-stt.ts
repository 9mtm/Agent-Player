/**
 * Local speech-to-text for the chat microphone (CHAT-PRO-02 C): ffmpeg turns
 * the recorded clip into 16 kHz mono WAV, whisper.cpp (`whisper-cli`) turns
 * that into text. Nothing leaves this computer. One clip at a time.
 *
 * Paths: DPRO_WHISPER_CLI / DPRO_FFMPEG (else found on PATH or in Homebrew),
 * DPRO_WHISPER_MODEL (else ~/.local/share/dpro/whisper/ggml-large-v3-turbo-q5_0.bin).
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
export const STT_LANGUAGES = ['auto', 'ar', 'en', 'de'] as const;
export type SttLanguage = (typeof STT_LANGUAGES)[number];
export class SttError extends Error { constructor(readonly code: 'unavailable' | 'invalid' | 'busy' | 'failed', message: string) { super(message); } }

const SEARCH = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'];
function find(envName: string, names: string[]): string | null {
  const own = process.env[envName];
  if (own) return path.isAbsolute(own) && existsSync(own) ? own : null;
  const dirs = [...(process.env.PATH ?? '').split(path.delimiter), ...SEARCH];
  for (const dir of dirs) for (const n of names) { const p = path.join(dir, n); if (dir && existsSync(p)) return p; }
  return null;
}
export function sttSetup() {
  const model = process.env.DPRO_WHISPER_MODEL || path.join(os.homedir(), '.local/share/dpro/whisper/ggml-large-v3-turbo-q5_0.bin');
  const whisper = find('DPRO_WHISPER_CLI', ['whisper-cli', 'whisper-cpp']);
  const ffmpeg = find('DPRO_FFMPEG', ['ffmpeg']);
  const missing = [!whisper && 'whisper-cli', !ffmpeg && 'ffmpeg', !existsSync(model) && 'the whisper model'].filter(Boolean) as string[];
  return { whisper, ffmpeg, model, available: missing.length === 0, missing };
}

const run = (file: string, args: string[], timeout: number) => new Promise<string>((resolve, reject) =>
  execFile(file, args, { timeout, maxBuffer: 4 * 1024 * 1024, env: { PATH: [...SEARCH, process.env.PATH ?? ''].join(':'), HOME: os.homedir(), LC_ALL: 'C' } },
    (err, out) => (err ? reject(err) : resolve(String(out)))));

/** Audio container sniffing: WebM/Matroska, Ogg, MP4/M4A, WAV, MP3. */
export function audioKind(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.readUInt32BE(0) === 0x1a45dfa3) return 'webm';
  if (buf.toString('ascii', 0, 4) === 'OggS') return 'ogg';
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return 'wav';
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'mp3';
  return null;
}

let busy = false;
/** Text of one recorded clip. */
export async function transcribe(audio: Buffer, language: SttLanguage = 'auto'): Promise<{ text: string; ms: number }> {
  const setup = sttSetup();
  if (!setup.available) throw new SttError('unavailable', `Speech-to-text is not set up on this computer (missing ${setup.missing.join(', ')})`);
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) throw new SttError('invalid', 'The recording is empty or too long');
  const kind = audioKind(audio);
  if (!kind) throw new SttError('invalid', 'Not a supported audio recording');
  if (!(STT_LANGUAGES as readonly string[]).includes(language)) throw new SttError('invalid', 'Unknown language');
  if (busy) throw new SttError('busy', 'Another recording is being transcribed');
  busy = true;
  const started = Date.now();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dpro-stt-'));
  try {
    const input = path.join(dir, `clip.${kind}`), wav = path.join(dir, 'clip.wav'), out = path.join(dir, 'clip');
    await fs.writeFile(input, audio, { mode: 0o600 });
    await run(setup.ffmpeg!, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-i', input, '-t', '300', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav], 60_000);
    const threads = String(Math.max(2, Math.min(8, os.cpus().length - 2)));
    await run(setup.whisper!, ['-m', setup.model, '-f', wav, '-l', language, '-t', threads, '-nt', '-np', '-otxt', '-of', out], 180_000);
    const text = (await fs.readFile(`${out}.txt`, 'utf8')).replace(/\s*\n\s*/g, ' ').replace(/\[(BLANK_AUDIO|Music|music|MUSIC)\]/g, '').trim();
    return { text, ms: Date.now() - started };
  } catch (err) {
    if (err instanceof SttError) throw err;
    throw new SttError('failed', 'The recording could not be transcribed');
  } finally {
    busy = false;
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
