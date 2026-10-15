import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Rich answers (CHAT-SPEC-01): an agent's ```spec block — JSON patch lines
 * that build an element tree — drawn as read-only cards, tables, metrics,
 * timelines, progress bars and charts. Only the display set the chat prompt
 * offers is drawn; anything else is left out, and a block that does not parse
 * falls back to plain code.
 */
export type SpecNode = { id: string; type: string; props: Record<string, unknown>; children: SpecNode[] };
export const SPEC_TYPES = ['Card', 'Stack', 'Grid', 'Heading', 'Text', 'Metric', 'Badge', 'Table', 'Callout', 'Timeline', 'ProgressBar', 'BarChart', 'LineChart', 'AreaChart', 'PieChart', 'Link'] as const;
const MAX_ELEMENTS = 200, MAX_DEPTH = 8;

const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown, max = 400) => (typeof x === 'string' ? x.slice(0, max) : typeof x === 'number' && Number.isFinite(x) ? String(x) : '');
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x)) ? Number(x) : null);

/** The tree from a spec block, or null when it does not parse. */
export function parseSpec(text: string): SpecNode | null {
  let root: string | null = null;
  const elements = new Map<string, { type: string; props: Record<string, unknown>; children: string[] }>();
  for (const line of text.split('\n')) {
    const t = line.trim(); if (!t) continue;
    let op: unknown; try { op = JSON.parse(t); } catch { return null; }
    if (!record(op) || op.op !== 'add' || typeof op.path !== 'string') continue;
    if (op.path === '/root' && typeof op.value === 'string') { root = op.value; continue; }
    const m = /^\/elements\/([^/]{1,80})$/.exec(op.path);
    if (!m || !record(op.value) || typeof op.value.type !== 'string') continue;
    if (elements.size >= MAX_ELEMENTS) break;
    elements.set(m[1], { type: op.value.type, props: record(op.value.props) ? op.value.props : {}, children: Array.isArray(op.value.children) ? op.value.children.filter((c): c is string => typeof c === 'string').slice(0, 60) : [] });
  }
  if (!root || !elements.has(root)) return null;
  const build = (id: string, depth: number, seen: Set<string>): SpecNode | null => {
    const e = elements.get(id);
    if (!e || depth > MAX_DEPTH || seen.has(id) || !(SPEC_TYPES as readonly string[]).includes(e.type)) return null;
    const next = new Set(seen).add(id);
    return { id, type: e.type, props: e.props, children: e.children.map(c => build(c, depth + 1, next)).filter((n): n is SpecNode => !!n) };
  };
  return build(root, 0, new Set());
}

export function SpecView({ text }: { text: string }) {
  const tree = parseSpec(text);
  if (!tree) return null;
  return <div className="spec" dir="auto">{render(tree)}</div>;
}

function render(n: SpecNode): ReactNode {
  const p = n.props; const kids = n.children.map(c => <SpecPart key={c.id} node={c}/>);
  switch (n.type) {
    case 'Card': return <section className="spec-card">{str(p.title) && <h4>{str(p.title, 160)}</h4>}{str(p.description) && <p className="spec-muted">{str(p.description)}</p>}{kids}</section>;
    case 'Stack': return <div className="spec-stack" data-dir={p.direction === 'horizontal' ? 'h' : 'v'} data-gap={gap(p.gap)}>{kids}</div>;
    case 'Grid': return <div className="spec-grid" data-cols={p.columns === 3 ? 3 : 2} data-gap={gap(p.gap)}>{kids}</div>;
    case 'Heading': return p.level === 'h2' ? <h3 className="spec-h">{str(p.text, 200)}</h3> : <h4 className="spec-h">{str(p.text, 200)}</h4>;
    case 'Text': return <p className={p.muted === true ? 'spec-text spec-muted' : 'spec-text'}>{str(p.content, 2000)}</p>;
    case 'Metric': return <div className="spec-metric"><span className="spec-metric-label">{str(p.label, 80)}</span><strong className="spec-metric-value">{str(p.value, 40)}</strong>
      {(str(p.detail) || p.trend === 'up' || p.trend === 'down') && <span className="spec-metric-detail" data-trend={p.trend === 'up' || p.trend === 'down' ? p.trend : undefined}>{p.trend === 'up' ? '▲ ' : p.trend === 'down' ? '▼ ' : ''}{str(p.detail, 120)}</span>}</div>;
    case 'Badge': return <span className="spec-badge" data-variant={['success', 'warning', 'destructive'].includes(String(p.variant)) ? p.variant as string : undefined}>{str(p.text, 60)}</span>;
    case 'Callout': return <aside className="spec-callout" data-type={['tip', 'warning', 'important'].includes(String(p.type)) ? p.type as string : 'info'}>{str(p.title) && <strong>{str(p.title, 160)}</strong>}<p>{str(p.content, 2000)}</p></aside>;
    case 'Table': return <SpecTable props={p}/>;
    case 'Timeline': return <ol className="spec-timeline">{(Array.isArray(p.items) ? p.items : []).filter(record).slice(0, 30).map((it, i) =>
      <li key={i} data-status={['completed', 'current'].includes(String(it.status)) ? it.status as string : 'upcoming'}>
        <span className="spec-tl-dot" aria-hidden="true"/><div><strong>{str(it.title, 160)}</strong>{str(it.date) && <span className="spec-muted"> · {str(it.date, 40)}</span>}{str(it.description) && <p className="spec-muted">{str(it.description, 600)}</p>}</div>
      </li>)}</ol>;
    case 'ProgressBar': { const v = Math.max(0, Math.min(100, num(p.value) ?? 0)); return <div className="spec-progress"><div className="spec-progress-head"><span>{str(p.label, 120)}</span>{p.showPercent !== false && <span className="spec-muted">{Math.round(v)}%</span>}</div>
      <div className="spec-progress-track" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={str(p.label, 120) || 'Progress'}><i data-color={['success', 'warning', 'destructive'].includes(String(p.color)) ? p.color as string : undefined} style={{ inlineSize: `${v}%` }}/></div></div>; }
    case 'Link': { const href = str(p.href, 600); return /^https:\/\/[^\s"'<>]+$/.test(href) ? <a className="spec-link" href={href} target="_blank" rel="noopener noreferrer">{str(p.text, 160) || href}</a> : <span>{str(p.text, 160)}</span>; }
    case 'BarChart': case 'LineChart': case 'AreaChart': return <XYChart kind={n.type} props={p}/>;
    case 'PieChart': return <PieChart props={p}/>;
  }
  return null;
}
const gap = (g: unknown) => (g === 'sm' || g === 'lg' ? g : 'md');
function SpecPart({ node }: { node: SpecNode }) { return <>{render(node)}</>; }

type Col = { key: string; label: string };
function SpecTable({ props }: { props: Record<string, unknown> }) {
  const data = (Array.isArray(props.data) ? props.data : []).filter(record).slice(0, 200);
  const cols: Col[] = Array.isArray(props.columns) && props.columns.length
    ? props.columns.filter(record).map(c => ({ key: str(c.key, 80), label: str(c.label, 80) || str(c.key, 80) })).filter(c => c.key).slice(0, 12)
    : Object.keys(data[0] ?? {}).slice(0, 12).map(k => ({ key: k, label: k }));
  if (!cols.length || !data.length) return null;
  return <div className="spec-table-wrap"><table className="spec-table"><thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
    <tbody>{data.map((r, i) => <tr key={i}>{cols.map(c => <td key={c.key} data-num={num(r[c.key]) !== null || undefined}>{str(r[c.key], 300)}</td>)}</tr>)}</tbody></table></div>;
}

/** One-series bar / line / area chart in plain SVG: thin marks, recessive grid, hover value, table view. */
function XYChart({ kind, props }: { kind: string; props: Record<string, unknown> }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const xKey = str(props.xKey, 80), yKey = str(props.yKey, 80);
  const rows = (Array.isArray(props.data) ? props.data : []).filter(record).slice(0, 60)
    .map(r => ({ x: str(r[xKey], 40), y: num(r[yKey]) })).filter((r): r is { x: string; y: number } => r.y !== null);
  if (!xKey || !yKey || rows.length < 1) return null;
  const title = str(props.title, 160);
  const W = 560, H = 220, L = 44, R = 12, T = 12, B = 30;
  const max = Math.max(0, ...rows.map(r => r.y)), min = Math.min(0, ...rows.map(r => r.y));
  const span = max - min || 1;
  const ticks = niceTicks(min, max);
  const y = (v: number) => T + (H - T - B) * (1 - (v - min) / span);
  const step = (W - L - R) / rows.length;
  const cx = (i: number) => L + step * i + step / 2;
  const fmt = (v: number) => Math.abs(v) >= 1000 ? Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v) : String(Math.round(v * 100) / 100);
  const every = Math.ceil(rows.length / 8);
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(r.y).toFixed(1)}`).join(' ');
  return <figure className="spec-chart">
    <figcaption><span>{title || yKey}</span><button type="button" className="link-button" onClick={() => setTable(v => !v)} aria-pressed={table}>{table ? 'Chart' : 'Table'}</button></figcaption>
    {table ? <SpecTable props={{ data: rows.map(r => ({ [xKey]: r.x, [yKey]: r.y })), columns: [{ key: xKey, label: xKey }, { key: yKey, label: yKey }] }}/>
      : <svg viewBox={`0 0 ${W} ${H}`} className="spec-svg" role="img" aria-label={`${title || yKey}: ${rows.map(r => `${r.x} ${r.y}`).join(', ')}`} onMouseLeave={() => setHover(null)}>
        {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? 'spec-axis' : 'spec-gridline'}/><text x={L - 6} y={y(t) + 3} className="spec-tick" textAnchor="end">{fmt(t)}</text></g>)}
        {rows.map((r, i) => i % every === 0 && <text key={i} x={cx(i)} y={H - 10} className="spec-tick" textAnchor="middle">{r.x.length > 10 ? `${r.x.slice(0, 9)}…` : r.x}</text>)}
        {kind === 'BarChart' && rows.map((r, i) => { const w = Math.max(2, Math.min(36, step - 2)); const top = y(Math.max(r.y, 0)), bot = y(Math.min(r.y, 0)); const h = Math.max(1, bot - top); const rad = Math.min(4, h / 2, w / 2);
          return <path key={i} className="spec-bar" data-hover={hover === i || undefined} d={r.y >= 0
            ? `M${cx(i) - w / 2},${bot} V${top + rad} Q${cx(i) - w / 2},${top} ${cx(i) - w / 2 + rad},${top} H${cx(i) + w / 2 - rad} Q${cx(i) + w / 2},${top} ${cx(i) + w / 2},${top + rad} V${bot} Z`
            : `M${cx(i) - w / 2},${top} V${bot - rad} Q${cx(i) - w / 2},${bot} ${cx(i) - w / 2 + rad},${bot} H${cx(i) + w / 2 - rad} Q${cx(i) + w / 2},${bot} ${cx(i) + w / 2},${bot - rad} V${top} Z`}/>; })}
        {kind === 'AreaChart' && <path className="spec-area" d={`${line} L${cx(rows.length - 1)},${y(Math.max(min, 0))} L${cx(0)},${y(Math.max(min, 0))} Z`}/>}
        {kind !== 'BarChart' && <path className="spec-line" d={line}/>}
        {hover !== null && kind !== 'BarChart' && <><line className="spec-cross" x1={cx(hover)} x2={cx(hover)} y1={T} y2={H - B}/><circle className="spec-dot" cx={cx(hover)} cy={y(rows[hover].y)} r={4}/></>}
        {rows.map((_, i) => <rect key={i} x={L + step * i} y={T} width={step} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)}/>)}
        {hover !== null && <g className="spec-tip" transform={`translate(${Math.min(Math.max(cx(hover), L + 50), W - R - 50)},${T + 2})`}>
          <rect x={-50} y={0} width={100} height={34} rx={6}/><text y={14} textAnchor="middle" className="spec-tip-x">{rows[hover].x.slice(0, 16)}</text><text y={28} textAnchor="middle" className="spec-tip-y">{fmt(rows[hover].y)}</text></g>}
      </svg>}
  </figure>;
}

/** Up to eight slices in the fixed palette order; the rest fold into "Other". A legend names every slice. */
function PieChart({ props }: { props: Record<string, unknown> }) {
  const [table, setTable] = useState(false);
  const nameKey = str(props.nameKey, 80), valueKey = str(props.valueKey, 80);
  let rows = (Array.isArray(props.data) ? props.data : []).filter(record).map(r => ({ name: str(r[nameKey], 60), value: num(r[valueKey]) }))
    .filter((r): r is { name: string; value: number } => r.value !== null && r.value > 0).slice(0, 60);
  if (!nameKey || !valueKey || !rows.length) return null;
  if (rows.length > 8) { const rest = rows.slice(7).reduce((s, r) => s + r.value, 0); rows = [...rows.slice(0, 7), { name: 'Other', value: rest }]; }
  const total = rows.reduce((s, r) => s + r.value, 0);
  const title = str(props.title, 160);
  let a = -Math.PI / 2;
  const arcs = rows.map((r, i) => {
    const sweep = (r.value / total) * Math.PI * 2; const a0 = a, a1 = a + sweep; a = a1;
    const R = 80, rIn = 46, c = 100;
    const p = (ang: number, rad: number) => `${(c + rad * Math.cos(ang)).toFixed(2)},${(c + rad * Math.sin(ang)).toFixed(2)}`;
    const large = sweep > Math.PI ? 1 : 0;
    const d = rows.length === 1 ? `M${c - R},${c} A${R},${R} 0 1 1 ${c + R},${c} A${R},${R} 0 1 1 ${c - R},${c} M${c - rIn},${c} A${rIn},${rIn} 0 1 0 ${c + rIn},${c} A${rIn},${rIn} 0 1 0 ${c - rIn},${c} Z`
      : `M${p(a0, R)} A${R},${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, rIn)} A${rIn},${rIn} 0 ${large} 0 ${p(a0, rIn)} Z`;
    return { ...r, d, slot: i + 1, pct: Math.round((r.value / total) * 100) };
  });
  return <figure className="spec-chart">
    <figcaption><span>{title || valueKey}</span><button type="button" className="link-button" onClick={() => setTable(v => !v)} aria-pressed={table}>{table ? 'Chart' : 'Table'}</button></figcaption>
    {table ? <SpecTable props={{ data: rows.map(r => ({ [nameKey]: r.name, [valueKey]: r.value })), columns: [{ key: nameKey, label: nameKey }, { key: valueKey, label: valueKey }] }}/>
      : <div className="spec-pie"><svg viewBox="0 0 200 200" className="spec-svg spec-pie-svg" role="img" aria-label={`${title || valueKey}: ${arcs.map(x => `${x.name} ${x.pct}%`).join(', ')}`}>
        {arcs.map(x => <path key={x.slot} d={x.d} className="spec-slice" data-slot={x.slot}><title>{`${x.name}: ${x.value} (${x.pct}%)`}</title></path>)}</svg>
        <ul className="spec-legend">{arcs.map(x => <li key={x.slot}><i data-slot={x.slot} aria-hidden="true"/>{x.name}<span className="spec-muted">{x.pct}%</span></li>)}</ul></div>}
  </figure>;
}

function niceTicks(min: number, max: number): number[] {
  const span = max - min || 1; const raw = span / 4; const mag = 10 ** Math.floor(Math.log10(raw));
  const stepv = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= 5) ?? mag * 10;
  const out: number[] = []; for (let v = Math.ceil(min / stepv) * stepv; v <= max + 1e-9 && out.length < 8; v += stepv) out.push(Math.round(v * 1e6) / 1e6);
  if (!out.includes(0) && min <= 0 && max >= 0) out.push(0);
  return out;
}
