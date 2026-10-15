import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { TerminalController } from './terminal';
import { UiIcon } from './ui-icons';

/** The terminal screen: a shell in the project folder (owner only, this computer only). */
export function TerminalPane({ terminal, projectId }: { terminal: TerminalController; projectId: string | null }) {
  const s = useSyncExternalStore(terminal.subscribe, terminal.getSnapshot, terminal.getSnapshot);
  const host = useRef<HTMLDivElement>(null);
  const size = useRef({ cols: 80, rows: 24 });

  // A different project gets a fresh shell in its own folder.
  useEffect(() => { if (s.phase === 'open' && s.projectId !== projectId) void terminal.close(); }, [terminal, projectId, s.phase, s.projectId]);
  useEffect(() => { if (s.phase === 'idle') void terminal.open(projectId, size.current); }, [terminal, projectId, s.phase]);

  useEffect(() => {
    const el = host.current; if (!el) return;
    let stop = () => {};
    let cancelled = false;
    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit'), import('@xterm/xterm/css/xterm.css')]);
      if (cancelled) return;
      const css = getComputedStyle(el);
      const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      const term = new Terminal({
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.2, cursorBlink: true, scrollback: 5000, allowProposedApi: false,
        theme: { background: color('--terminal-bg', '#141414'), foreground: color('--text', '#e6e6e6'), cursor: color('--accent', '#3b82f6'), selectionBackground: 'rgba(120,140,200,.35)' },
      });
      const fit = new FitAddon(); term.loadAddon(fit);
      term.open(el);
      const refit = () => { try { fit.fit(); size.current = { cols: term.cols, rows: term.rows }; terminal.resize(term.cols, term.rows); } catch { /* hidden pane */ } };
      refit();
      const offOut = terminal.onOutput(d => term.write(d));
      const input = term.onData(d => terminal.write(d));
      const ro = new ResizeObserver(refit); ro.observe(el);
      term.focus();
      stop = () => { ro.disconnect(); input.dispose(); offOut(); term.dispose(); };
    })();
    return () => { cancelled = true; stop(); };
  }, [terminal]);

  const home = s.cwd.match(/^\/Users\/[^/]+/)?.[0];
  return <div className="pane terminal-pane" aria-label="Terminal">
    <div className="pane-head">
      <UiIcon name="terminal" size={12}/>
      <span className="pane-path" dir="ltr" title={s.cwd}>{s.cwd ? (home ? `~${s.cwd.slice(home.length)}` : s.cwd) : 'Terminal'}</span>
      {s.shell && <span className="muted">{s.shell}</span>}
      <button type="button" className="row-tool pane-refresh" aria-label="New terminal" title="Close this shell and start a new one" onClick={() => void terminal.close()}><UiIcon name="refresh" size={12}/></button>
    </div>
    {(s.phase === 'off' || s.phase === 'error' || s.phase === 'exited') && <p className={s.phase === 'exited' ? 'pane-empty' : 'pane-empty error'} role="status">
      {s.phase === 'exited' ? 'The shell has exited.' : s.message} {s.phase !== 'off' && <button type="button" className="link-button" onClick={() => void terminal.close()}>Start a new one</button>}</p>}
    <div className="terminal-screen" ref={host} dir="ltr"/>
  </div>;
}
