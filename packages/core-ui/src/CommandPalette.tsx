import { useEffect, useMemo, useRef, useState } from 'react';

export type Command = { id: string; label: string; group: string; hint?: string; run: () => void };

/** The ⌘K command box: a floating HUD at the top centre; type to filter, arrows to move, Enter to run, Esc to close. */
export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: readonly Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter(c => !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [commands, query]);
  useEffect(() => { if (open) { setQuery(''); setIndex(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);
  useEffect(() => { setIndex(0); }, [query]);
  if (!open) return null;
  const run = (c: Command | undefined) => { if (!c) return; onClose(); c.run(); };
  let lastGroup = '';
  return <div className="cmdk-layer" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="cmdk" role="dialog" aria-label="Commands" aria-modal="true">
      <input ref={input} className="cmdk-input" aria-label="Type a command" placeholder="Type a command or a page…" value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); onClose(); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, list.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); run(list[index]); }
        }}/>
      <ul className="cmdk-list" role="listbox" aria-label="Commands">
        {list.map((c, i) => {
          const heading = c.group !== lastGroup ? (lastGroup = c.group) : null;
          return <li key={c.id} role="presentation">
            {heading && <p className="cmdk-group">{heading}</p>}
            <button type="button" role="option" aria-selected={i === index} className="cmdk-item" onMouseEnter={() => setIndex(i)} onClick={() => run(c)}>
              <span>{c.label}</span>{c.hint && <kbd>{c.hint}</kbd>}
            </button>
          </li>;
        })}
        {list.length === 0 && <li className="cmdk-empty">No command matches “{query}”.</li>}
      </ul>
    </div>
  </div>;
}
