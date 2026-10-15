import type { ReactNode } from 'react';

/**
 * A small, safe Markdown display for chat replies. Text becomes React
 * elements only (React escapes every string; no HTML is ever parsed or
 * injected). Supported: paragraphs, #-####### headings, > quotes, - * +
 * and 1. lists, ``` fenced code (an unterminated fence while a reply streams
 * shows as code), --- breaks, `inline code`, **bold**, *italic* / _italic_,
 * and [links](address) for http(s) and mailto only; anything else stays
 * plain text.
 */
export function Markdown({ text }: { text: string }) {
  return <div className="md">{blocks(text)}</div>;
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[]; start: number }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'hr' };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${fence[1]}\\s*$`).test(lines[i])) body.push(lines[i++]);
      i++; // closing fence (or end of a streaming reply)
      out.push({ kind: 'code', lang: fence[2], text: body.join('\n') });
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { out.push({ kind: 'h', level: h[1].length, text: h[2].replace(/\s+#+\s*$/, '') }); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push({ kind: 'hr' }); i++; continue; }
    if (/^\s*>/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push({ kind: 'quote', lines: q });
      continue;
    }
    const ul = /^\s*[-*+]\s+(.*)$/, ol = /^\s*(\d{1,9})[.)]\s+(.*)$/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items: string[] = [];
      const start = ordered ? Number(ol.exec(line)![1]) : 1;
      while (i < lines.length && (re.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const m = re.exec(lines[i]);
        if (m) items.push(ordered ? m[2] : m[1]);
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out.push({ kind: ordered ? 'ol' : 'ul', items, start });
      continue;
    }
    const p: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s|^\s*>|^\s*[-*+]\s|^\s*\d{1,9}[.)]\s|^\s*(```|~~~)/.test(lines[i])) p.push(lines[i++]);
    if (p.length === 0) { p.push(lines[i++]); }
    out.push({ kind: 'p', lines: p });
  }
  return out;
}

function blocks(source: string): ReactNode[] {
  return parseBlocks(source).map((b, k) => {
    switch (b.kind) {
      case 'h': { const H = (`h${Math.min(b.level + 2, 6)}`) as 'h3'; return <H key={k} className={`md-h md-h${b.level}`}>{inline(b.text)}</H>; }
      case 'hr': return <div key={k} className="md-hr" role="separator"/>;
      case 'quote': return <blockquote key={k}>{withBreaks(b.lines)}</blockquote>;
      case 'ul': return <ul key={k}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>;
      case 'ol': return <ol key={k} start={b.start}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>;
      case 'code': return <pre key={k} className="md-code" dir="ltr" data-lang={b.lang || undefined}><code>{b.text}</code></pre>;
      default: return <p key={k}>{withBreaks(b.lines)}</p>;
    }
  });
}

function withBreaks(lines: string[]): ReactNode[] {
  return lines.flatMap((l, j) => (j ? [<br key={`b${j}`}/>, ...inline(l, `l${j}`)] : inline(l, `l${j}`)));
}

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\[[^\]\n]+\]\([^)\s]+\))|(\*[^*\s][^*\n]*\*)|(_[^_\s][^_\n]*_)/;

/** Inline markup to React nodes; plain strings stay strings (escaped by React). */
export function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) { out.push(rest); break; }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${n++}`;
    if (m[1]) out.push(<code key={key} className="md-inline">{tok.slice(1, -1)}</code>);
    else if (m[2] || m[3]) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>);
    else if (m[4]) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const href = safeHref(lm[2]);
      out.push(href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{lm[1]}</a> : tok);
    } else out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

/** Only http(s) and mailto links; everything else (javascript:, data:, relative) is refused. */
export function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}
