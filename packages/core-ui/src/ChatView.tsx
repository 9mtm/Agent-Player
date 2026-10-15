import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { ConversationsController } from './conversations';
import { AgentPanel } from './AgentPanel';
import type { SessionClient } from './session';
import { Markdown } from './markdown';
import { UiIcon } from './ui-icons';
import type { UiIconName } from './ui-icons';
import { approxTokens, duration, splitWork, toolCount, toolView, turnOutputs, workSummary } from './turns';
import type { Part, ToolCall, ToolKind, Turn } from './turns';

/** Pixels from the bottom within which the thread keeps following new text. */
export const FOLLOW_PX = 80;
/** A busy turn with no new output for this long shows the working row. */
export const QUIET_MS = 1500;
/** In a long live step only the newest tool rows stay open; older ones fold. */
export const LIVE_ROWS = 4;

const SUGGESTIONS = [
  'Plan this week for the team and put the tasks on the board',
  'Review what the agents did today and list open questions',
  'Draft a short update for the company in Arabic and English',
];

/**
 * The chat page: a reading column (the user's messages right-aligned in a
 * quiet bubble that stays pinned while its answer scrolls; the agent's work
 * as one-line rows; its answer as plain prose) and a docked composer. A
 * finished turn folds its work into "Worked for …". Behaviour lives in
 * ConversationsController; this file is layout and local view state only.
 */
export function ChatView({ controller, mode, productName = 'Dpro', client }: { controller: ConversationsController; mode: 'live' | 'mock'; productName?: string; client?: SessionClient }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const thread = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [following, setFollowing] = useState(true);
  const [below, setBelow] = useState(false);
  const running = !!s.runId;
  const busy = running || s.starting;

  // Follow the newest output only while the reader is near the bottom.
  useLayoutEffect(() => {
    const el = thread.current;
    if (!el) return;
    if (following) el.scrollTop = el.scrollHeight;
    else setBelow(true);
  }, [s.turns]);
  // Opening another conversation starts at its end.
  useLayoutEffect(() => { const el = thread.current; if (el) el.scrollTop = el.scrollHeight; setFollowing(true); setBelow(false); }, [s.activeId, s.threadPhase === 'ready']);
  const onScroll = () => {
    const el = thread.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_PX;
    setFollowing(near);
    if (near) setBelow(false);
  };
  const jump = () => { const el = thread.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); setFollowing(true); setBelow(false); };

  // The composer grows with its text up to a cap.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [s.draft]);
  useEffect(() => { input.current?.focus(); }, [s.activeId]);

  const submit = () => { if (s.draft.trim() || s.attachments.length) { setFollowing(true); void controller.send(); } };
  const picker = useRef<HTMLInputElement>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    try {
      const files = await Promise.all([...list].map(async f => ({ name: f.name, text: f.size > 2_000_000 ? '\u0000' : await f.text() })));
      setAttachError(controller.attach(files));
    } catch { setAttachError('The file could not be read.'); }
    if (picker.current) picker.current.value = '';
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!e.repeat) submit(); return; }
    if (e.key === 'Escape' && running) { e.preventDefault(); void controller.stop(); return; }
    if (e.key === 'ArrowUp' && !s.draft) { const last = controller.recall(); if (last) { e.preventDefault(); controller.edit(last); } }
  };

  const lastUser = [...s.turns].reverse().find(t => t.role === 'user');
  const agentName = s.agents.find(a => a.id === s.agentId)?.name;
  const empty = s.turns.length === 0 && s.threadPhase !== 'loading';

  const project = controller.activeProject();
  const [panel, setPanel] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1100);
  return <div className="chat-layout" data-panel={panel || undefined}>
  <div className="chat-screen">
    <div className="chat-topbar">
      {project ? <ProjectBar name={project.name} folder={project.folder} repoUrl={project.repoUrl} git={s.git}/> : <span className="chat-topbar-spacer"/>}
      <button type="button" className="tool chat-panel-toggle" aria-pressed={panel} aria-label={panel ? 'Hide details' : 'Show details'} title={panel ? 'Hide details' : 'Show details'} onClick={() => setPanel(v => !v)}><UiIcon name="sidebar" size={14}/></button>
    </div>
    <div className="chat-thread" ref={thread} onScroll={onScroll} aria-label="Conversation">
      {s.threadPhase === 'loading' && <p className="chat-loading" role="status"><span className="pulse" aria-hidden="true"/>Opening the conversation</p>}
      {empty ? <div className="chat-empty">
        <p className="chat-wordmark">{productName}</p>
        <p className="chat-tagline">{mode === 'mock'
          ? 'Offline practice: replies are fictional and nothing leaves this page.'
          : 'Brief your team. Your agents work like real staff — each with its own role, memory and permissions.'}</p>
        <div className="chat-suggestions">{SUGGESTIONS.map(t =>
          <button key={t} type="button" className="chat-suggestion" onClick={() => void controller.send(t)}>{t}</button>)}</div>
      </div> : <div className="chat-column" role="log" aria-live="polite" aria-relevant="additions">
        {s.turns.map((t, i) => t.role === 'user'
          ? <UserMessage key={t.key} turn={t}/>
          : <AssistantTurn key={t.key} turn={t} last={i === s.turns.length - 1} onRetry={lastUser ? () => void controller.send(lastUser.content) : undefined}/>)}
        {s.starting && !s.turns.some(t => t.status === 'running') && <WorkingRow since={Date.now()} label="Starting"/>}
      </div>}
    </div>
    {below && !empty && <button type="button" className="chat-jump" onClick={jump} aria-label="Jump to the latest message"><UiIcon name="arrow-down" size={15}/></button>}
    <div className="chat-dock">
      {s.notice && <p className="chat-notice" role="status">{s.notice}</p>}
      {s.reconnecting && <p className="chat-notice" role="status">Reconnecting to the reply…</p>}
      {s.queuePaused && s.queue.length > 0 && <p className="chat-notice" role="status">Stopped. The waiting {s.queue.length === 1 ? 'message stays' : 'messages stay'} here until you send {s.queue.length === 1 ? 'it' : 'them'}.</p>}
      {s.queue.length > 0 && <ul className="chat-queue" aria-label="Waiting to send">
        {s.queue.map((q, i) => <li key={q.key}>
          <span className="chat-queue-n">{i === 0 ? 'Next' : `${i + 1}.`}</span>
          <span className="chat-queue-text" dir="auto">{q.text}</span>
          {s.queuePaused && !busy && <button type="button" className="ghost-action strong" onClick={() => controller.sendQueued(q.key)}>Send now</button>}
          <button type="button" className="ghost-action" onClick={() => controller.editQueued(q.key)}>Edit</button>
          <button type="button" className="ghost-action" aria-label="Remove from the queue" onClick={() => controller.removeQueued(q.key)}><UiIcon name="trash" size={13}/></button>
        </li>)}
      </ul>}
      {(s.attachments.length > 0 || attachError) && <div className="chat-attachments" aria-label="Attached files">
        {s.attachments.map(f => <span key={f.name} className="attach-chip" dir="ltr"><UiIcon name="file" size={12}/>{f.name}<small>{Math.ceil(f.text.length / 1000)}k</small>
          <button type="button" className="row-tool" aria-label={`Remove ${f.name}`} onClick={() => controller.detach(f.name)}><UiIcon name="trash" size={11}/></button></span>)}
        {attachError && <span className="attach-error" role="alert">{attachError}</span>}
      </div>}
      <form className="chat-composer" method="post" onSubmit={e => { e.preventDefault(); submit(); }}
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); void onFiles(e.dataTransfer.files); } }}>
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <textarea id="chat-input" ref={input} rows={1} dir="auto" value={s.draft} maxLength={100000}
          placeholder={running ? 'Type the next message; it is sent when this reply ends' : agentName ? `Message ${agentName}` : s.turns.length ? 'Send a follow-up' : "What's on your mind?"}
          onChange={e => controller.edit(e.target.value)} onKeyDown={onKeyDown} disabled={s.access === 'denied'}/>
        <div className="chat-composer-row">
          <input ref={picker} type="file" multiple hidden onChange={e => void onFiles(e.target.files)}
            accept=".txt,.md,.csv,.json,.yml,.yaml,.xml,.toml,.ini,.log,.ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.rb,.go,.rs,.java,.php,.sh,.sql,.html,.css,text/*"/>
          <button type="button" className="tool composer-attach" aria-label="Attach text files" title="Attach text files (code, notes, CSV…)" onClick={() => picker.current?.click()}><UiIcon name="plus" size={14}/></button>
          {s.agents.length > 0 && !s.activeId
            ? <label className="composer-agent"><span className="sr-only">Agent</span>
              <select value={s.agentId} onChange={e => controller.selectAgent(e.target.value)}>
                <option value="">Main agent</option>
                {s.agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            : <span className="composer-hint">{agentName ? agentName : ''}</span>}
          {s.models.length > 0 && <label className="composer-agent composer-model"><span className="sr-only">Model</span>
            <select value={s.model} onChange={e => controller.selectModel(e.target.value)} title="Model for the next reply">
              <option value="">Agent's model</option>
              {s.models.some(m => m.provider === 'ollama') && <optgroup label="On this computer">{s.models.filter(m => m.provider === 'ollama').map(m => <option key={m.id} value={m.id}>{m.label}{m.size ? ` · ${m.size}` : ''}</option>)}</optgroup>}
              {s.models.some(m => m.provider === 'claude') && <optgroup label="Claude (paid)">{s.models.filter(m => m.provider === 'claude').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>}
            </select></label>}
          <span className="composer-keys" aria-hidden="true">{running ? 'Esc stops' : 'Enter sends · Shift+Enter new line'}</span>
          {running && !s.draft.trim()
            ? <button type="button" className="round-button stop" onClick={() => void controller.stop()} disabled={s.stopping} aria-label={s.stopping ? 'Stopping' : 'Stop the reply'}><UiIcon name="stop" size={10}/></button>
            : <button type="submit" className="round-button" disabled={(!s.draft.trim() && !s.attachments.length) || s.access === 'denied'} aria-label={busy ? 'Queue the message' : 'Send'}><UiIcon name="arrow-up" size={14}/></button>}
        </div>
      </form>
    </div>
  </div>
  {panel && <ChatSidePanel controller={controller} client={client}/>}
  </div>;
}

/** Details of the open conversation: where it works, how big it is, what it produced. */
function ChatSidePanel({ controller, client }: { controller: ConversationsController; client?: SessionClient }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const project = controller.activeProject();
  const conv = s.conversations.find(c => c.id === s.activeId);
  const outputs = turnOutputs(s.turns);
  const tokens = approxTokens(s.turns);
  const agent = s.agents.find(a => a.id === (conv?.agentId ?? s.agentId))?.name ?? 'Main agent';
  const model = s.models.find(m => m.id === s.model)?.label ?? (s.model || "Agent's model");
  const replies = s.turns.filter(t => t.role === 'assistant');
  const worked = replies.reduce((n, t) => n + (t.durationMs ?? 0), 0);
  const tools = workSummary(s.turns.flatMap(t => t.parts));
  const home = project?.folder?.match(/^\/Users\/[^/]+/)?.[0];
  return <aside className="chat-panel" aria-label="Conversation details">
    <section className="panel-card">
      <h3>Environment</h3>
      <dl className="panel-list">
        <div><dt><UiIcon name="board" size={12}/></dt><dd>{project ? project.name : <span className="muted">No project</span>}</dd></div>
        {project?.folder && <div><dt><UiIcon name="file" size={12}/></dt><dd dir="ltr" title={project.folder}>{home ? `~${project.folder.slice(home.length)}` : project.folder}</dd></div>}
        {s.git?.branch && <div><dt aria-label="Branch">⎇</dt><dd dir="ltr">{s.git.branch}</dd></div>}
        {(project?.repoUrl ?? s.git?.remote) && <div><dt><UiIcon name="globe" size={12}/></dt><dd dir="ltr">{(project?.repoUrl ?? s.git?.remote ?? '').replace(/^https:\/\//, '')}</dd></div>}
        <div><dt><UiIcon name="brain" size={12}/></dt><dd>{agent} · {model}</dd></div>
      </dl>
    </section>
    <section className="panel-card">
      <h3>Conversation</h3>
      <dl className="panel-list">
        <div><dt>Size</dt><dd>≈ {tokens.toLocaleString('en')} tokens</dd></div>
        <div><dt>Replies</dt><dd>{replies.length}{worked ? ` · worked ${duration(worked)}` : ''}</dd></div>
        {tools && <div><dt>Tools</dt><dd>{tools}</dd></div>}
      </dl>
    </section>
    <section className="panel-card">
      <h3>Outputs</h3>
      {outputs.length ? <ul className="panel-files">{outputs.slice(-8).reverse().map(o => <li key={o.path} dir="ltr"><UiIcon name={o.kind === 'edit' ? 'pencil' : 'file'} size={12}/><span title={o.path}>{o.path.split('/').at(-1)}</span></li>)}</ul>
        : <p className="muted">Files the agent writes appear here.</p>}
    </section>
    {project?.folder && <section className="panel-card">
      <h3>Changes</h3>
      {s.git && s.git.added !== null && s.git.added !== undefined
        ? (s.git.files ? <p className="panel-changes"><span className="plus">+{s.git.added}</span> <span className="minus">−{s.git.removed ?? 0}</span> <span className="muted">in {s.git.files} {s.git.files === 1 ? 'file' : 'files'} not committed</span></p>
          : <p className="muted">No uncommitted changes.</p>)
        : <p className="muted">Not a git folder.</p>}
    </section>}
    {client && <AgentPanel client={client} agentId={conv?.agentId || s.agentId || s.agents[0]?.id || ''}/>}
  </aside>;
}

/** Where this conversation works: project, folder, git branch and repository. */
function ProjectBar({ name, folder, repoUrl, git }: { name: string; folder: string | null; repoUrl: string | null; git: { branch: string | null; remote: string | null; dirty: boolean | null } | null }) {
  const home = folder?.match(/^\/Users\/[^/]+/)?.[0];
  const shortFolder = folder && home ? `~${folder.slice(home.length)}` : folder;
  const repo = repoUrl ?? git?.remote ?? null;
  const repoHref = repo && /^https:\/\//.test(repo) ? repo : null;
  return <div className="project-bar" aria-label="Project">
    <span className="project-bar-name"><UiIcon name="board" size={12}/>{name}</span>
    {shortFolder && <span className="project-bar-item" dir="ltr" title={folder ?? undefined}><UiIcon name="file" size={11}/>{shortFolder}</span>}
    {git?.branch && <span className="project-bar-item" dir="ltr" title={git.dirty ? 'Uncommitted changes' : 'Clean'}>⎇ {git.branch}{git.dirty ? <i className="project-dirty" aria-label="uncommitted changes"/> : null}</span>}
    {repo && (repoHref ? <a className="project-bar-item" href={repoHref} target="_blank" rel="noopener noreferrer" dir="ltr"><UiIcon name="globe" size={11}/>{repo.replace(/^https:\/\//, '')}</a>
      : <span className="project-bar-item" dir="ltr"><UiIcon name="globe" size={11}/>{repo}</span>)}
  </div>;
}

/** The user's message: right-aligned, pinned while its answer scrolls; long text folds. */
function UserMessage({ turn }: { turn: Turn }) {
  const [open, setOpen] = useState(false);
  // The pinned bubble stays short (3 lines) so the answer under it stays readable.
  const long = turn.content.length > 220 || turn.content.split('\n').length > 3;
  return <div className="chat-user" data-pending={turn.pending || undefined}>
    <div className="user-bubble" data-folded={long && !open || undefined}>
      <p className="sr-only">You</p>
      <div className="turn-text" dir="auto">{turn.content}</div>
    </div>
    {long && <button type="button" className="chat-more" onClick={() => setOpen(v => !v)}>{open ? 'Show less' : 'Show all'}</button>}
  </div>;
}

/** One assistant turn: live parts in order while running; work folded once finished. */
function AssistantTurn({ turn, last, onRetry }: { turn: Turn; last: boolean; onRetry?: () => void }) {
  const live = turn.status === 'running';
  const { work, answer } = splitWork(turn.parts);
  const tools = toolCount(turn.parts);
  const answerText = answer.filter(p => p.kind === 'text').map(p => (p as { text: string }).text).join('');
  const [quiet, since] = useQuiet(turn, live);
  return <article className="chat-assistant" aria-busy={live || undefined}>
    <p className="sr-only">Agent</p>
    {live
      ? <>{turn.parts.map((p, i) => <PartView key={i} part={p} live last={i === turn.parts.length - 1}/>)}
        {(quiet || turn.parts.length === 0) && <WorkingRow since={since} label={turn.parts.length ? 'Working' : 'Thinking'}/>}</>
      : <>
        {tools > 0
          ? <WorkedRow parts={work} ms={turn.durationMs}/>
          : work.map((p, i) => <PartView key={i} part={p}/>)}
        {answer.map((p, i) => <PartView key={`a${i}`} part={p}/>)}
        {turn.status === 'error' && <div className="chat-error" role="alert">
          <strong>{turn.code === 'model_unavailable' ? 'The model could not be reached' : 'This reply failed'}</strong>
          <span>{turn.code === 'model_unavailable' ? 'Check that the model is running, then try again.' : 'Anything above was written before the failure.'}</span>
          {last && onRetry && <button type="button" className="chat-error-action" onClick={onRetry}><UiIcon name="refresh" size={12}/>Try again</button>}
        </div>}
        <TurnFooter text={answerText || turn.content} ms={turn.durationMs} stopped={turn.status === 'stopped'}/>
      </>}
  </article>;
}

/** True when a live turn produced nothing for QUIET_MS; returns when that quiet began. */
function useQuiet(turn: Turn, live: boolean): [boolean, number] {
  const [quiet, setQuiet] = useState(false);
  const [since, setSince] = useState(() => turn.startedAt ?? Date.now());
  useEffect(() => {
    if (!live) { setQuiet(false); return; }
    setQuiet(false); const t0 = Date.now(); setSince(t0);
    const timer = setTimeout(() => setQuiet(true), QUIET_MS);
    return () => clearTimeout(timer);
  }, [turn.lastSeq, live]);
  return [quiet, since];
}

function PartView({ part, live = false, last = false }: { part: Part; live?: boolean; last?: boolean }) {
  if (part.kind === 'text') return part.text ? <div className="chat-prose turn-text md-host"><Markdown text={part.text}/></div> : null;
  if (part.kind === 'reasoning') return part.text.trim() ? <Thinking part={part} live={live && last && part.endedAt === undefined}/> : null;
  return <ToolStep calls={part.calls} live={live}/>;
}

function Thinking({ part, live }: { part: Extract<Part, { kind: 'reasoning' }>; live: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const shown = open ?? live;
  useLayoutEffect(() => { if (live && body.current) body.current.scrollTop = body.current.scrollHeight; }, [part.text, live]);
  const secs = part.startedAt !== undefined && part.endedAt !== undefined ? Math.round((part.endedAt - part.startedAt) / 1000) : undefined;
  const label = live ? 'Thinking' : secs === undefined ? 'Thought' : secs < 1 ? 'Thought briefly' : `Thought for ${duration(secs * 1000)}`;
  return <div className="scaffold thinking" data-open={shown || undefined}>
    <button type="button" className="scaffold-row" aria-expanded={shown} onClick={() => setOpen(!shown)}>
      <UiIcon name="brain" size={12}/><span className={live ? 'shimmer' : undefined}>{label}</span>
      {live && part.startedAt !== undefined && <Elapsed since={part.startedAt}/>}
      <span className="caret" aria-hidden="true"><UiIcon name="chevron" size={11}/></span>
    </button>
    {shown && <div ref={body} className="thinking-body" data-live={live || undefined} dir="auto"><Markdown text={part.text}/></div>}
  </div>;
}

/** One model step's tool calls; in a long live step the older rows fold under a count. */
function ToolStep({ calls, live }: { calls: readonly ToolCall[]; live: boolean }) {
  const [all, setAll] = useState(false);
  const hidden = live && !all && calls.length > LIVE_ROWS ? calls.length - LIVE_ROWS : 0;
  return <div className="scaffold tool-step">
    {hidden > 0 && <button type="button" className="scaffold-row muted" onClick={() => setAll(true)}>{hidden} earlier {hidden === 1 ? 'step' : 'steps'}</button>}
    {calls.slice(hidden).map(c => <ToolRow key={c.id} call={c}/>)}
  </div>;
}

const KIND_ICON: Record<ToolKind, UiIconName> = { command: 'terminal', read: 'file', write: 'file', edit: 'pencil', search: 'search', web: 'globe', browser: 'globe', memory: 'brain', board: 'board', other: 'tool' };

function ToolRow({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);
  const v = toolView(call);
  const hasDetail = !!(call.output || call.input.length > 2);
  return <div className="tool-row" data-error={call.isError || undefined} data-open={open || undefined}>
    <button type="button" className="scaffold-row" aria-expanded={hasDetail ? open : undefined} onClick={() => hasDetail && setOpen(v => !v)}>
      {call.running ? <span className="spinner" aria-hidden="true"/> : <UiIcon name={call.isError ? 'alert' : KIND_ICON[v.kind]} size={12}/>}
      <span className="tool-title"><span className={call.running ? 'shimmer' : 'tool-verb'}>{v.verb}</span>{v.target && <span className="tool-target" dir="auto">{v.kind === 'command' ? <code>{v.target}</code> : v.target}</span>}</span>
      {call.isError && <span className="tool-meta error">failed</span>}
      {!call.running && call.ms !== undefined && call.ms >= 100 && <span className="tool-meta">{duration(call.ms) === '0s' ? `${(call.ms / 1000).toFixed(1)}s` : duration(call.ms)}</span>}
      {hasDetail && <span className="caret" aria-hidden="true"><UiIcon name="chevron" size={11}/></span>}
    </button>
    {open && <ToolDetail call={call} kind={v.kind} command={v.command} args={v.args}/>}
  </div>;
}

function ToolDetail({ call, kind, command, args }: { call: ToolCall; kind: ToolKind; command?: string; args: Record<string, unknown> }) {
  const entries = Object.entries(args).filter(([k]) => !(kind === 'command' && ['command', 'cmd'].includes(k)));
  return <div className="tool-detail">
    {kind === 'command' && command && <pre className="tool-cmd" dir="ltr"><span aria-hidden="true">$ </span>{command}</pre>}
    {entries.length > 0 && <dl className="tool-args">{entries.slice(0, 12).map(([k, val]) =>
      <div key={k}><dt>{k}</dt><dd dir="auto">{typeof val === 'string' ? val.slice(0, 400) : JSON.stringify(val).slice(0, 400)}</dd></div>)}</dl>}
    {call.output !== undefined && <div className="tool-output">
      <div className="tool-output-head"><span>{call.isError ? 'Error' : 'Output'}</span><Copy text={call.output} label="Copy output"/></div>
      <pre dir="ltr">{call.output || '(no output)'}</pre>
    </div>}
    {call.running && <p className="tool-running">Running…</p>}
  </div>;
}

function WorkedRow({ parts, ms }: { parts: Part[]; ms: number | null }) {
  const [open, setOpen] = useState(false);
  const summary = workSummary(parts);
  return <div className="scaffold worked" data-open={open || undefined}>
    <button type="button" className="scaffold-row" aria-expanded={open} onClick={() => setOpen(v => !v)}>
      <UiIcon name="tool" size={12}/><span>{ms !== null ? `Worked for ${duration(ms)}` : 'Worked'}</span>
      {summary && <span className="worked-summary">· {summary}</span>}
      <span className="caret" aria-hidden="true"><UiIcon name="chevron" size={11}/></span>
    </button>
    {open && <div className="worked-body">{parts.map((p, i) => <PartView key={i} part={p}/>)}</div>}
  </div>;
}

function WorkingRow({ since, label }: { since: number; label: string }) {
  return <p className="scaffold working" role="status"><span className="pulse" aria-hidden="true"/><span className="shimmer">{label}</span><Elapsed since={since}/></p>;
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return <span className="elapsed">{s >= 1 ? duration(s * 1000) : ''}</span>;
}

function TurnFooter({ text, ms, stopped }: { text: string; ms: number | null; stopped: boolean }) {
  return <div className="turn-actions">
    {stopped && <span className="turn-chip">Stopped</span>}
    {ms !== null && <span className="turn-time" title={`This reply took ${duration(ms)}`}>{duration(ms)}</span>}
    {text && <Copy text={text} label="Copy reply"/>}
  </div>;
}

function Copy({ text, label }: { text: string; label: string }): ReactNode {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const copy = () => {
    const done = (s: 'done' | 'failed') => { setState(s); setTimeout(() => setState('idle'), 1500); };
    if (!navigator.clipboard) { done('failed'); return; }
    navigator.clipboard.writeText(text).then(() => done('done'), () => done('failed'));
  };
  return <button type="button" className="ghost-action" aria-label={state === 'done' ? 'Copied' : state === 'failed' ? 'Copy failed' : label} onClick={copy}>
    <UiIcon name={state === 'done' ? 'check' : 'copy'} size={13}/>
  </button>;
}
