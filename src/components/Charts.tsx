import { useRef, useState, type ReactNode } from 'react'
import { pngSupported, svgToPngBlob } from '../export/png'
import { deliverFile } from '../export/deliver'

/** Small dependency-free SVG charts that stay readable on a phone. */

/** The numbers behind a chart, as a table, for screen readers and for anyone who wants exact values. */
export function DataTable({ columns, rows, caption }: { columns: string[]; rows: (string | number)[][]; caption: string }) {
  return (
    <details className="chart-table">
      <summary className="muted">View the data as a table</summary>
      <table className="sets">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </details>
  )
}

/** A chart with its data table and a "Save image" button where the browser can do it. */
export function ChartBlock({ title, children, columns, rows }: { title: string; children: ReactNode; columns: string[]; rows: (string | number)[][] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [msg, setMsg] = useState('')
  const save = async () => {
    const svg = ref.current?.querySelector('svg.chart') as SVGSVGElement | null
    if (!svg) return setMsg('There is no chart to save yet.')
    try {
      const blob = await svgToPngBlob(svg, title)
      const r = await deliverFile(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, blob, 'image/png')
      setMsg(r === 'cancelled' ? 'Cancelled.' : r === 'shared' ? 'Image shared.' : 'Image saved to your downloads.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The image could not be saved.')
    }
  }
  return (
    <div ref={ref}>
      {children}
      {rows.length > 0 && <DataTable columns={columns} rows={rows} caption={title} />}
      {pngSupported() && rows.length > 0 && <button type="button" className="link-btn" onClick={() => void save()}>Save chart as image</button>}
      {msg && <p className="hint" role="status">{msg}</p>}
    </div>
  )
}

export function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 320
  const h = 120
  const bw = w / data.length
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} role="img" aria-label={label} className="chart">
      {data.map((d, i) => {
        const bh = (d.value / max) * (h - 16)
        return (
          <g key={i}>
            <rect x={i * bw + 6} y={h - bh} width={bw - 12} height={bh} rx={4} fill="var(--ac)" opacity={d.value ? 1 : 0.25} />
            <text x={i * bw + bw / 2} y={h - bh - 4} textAnchor="middle" fontSize="11" fill="var(--tx)">{d.value || ''}</text>
            <text x={i * bw + bw / 2} y={h + 14} textAnchor="middle" fontSize="10" fill="var(--mu)">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function LineChart({ points, label, unit }: { points: { x: string; y: number }[]; label: string; unit: string }) {
  if (points.length < 2) return <p className="muted">Log this at least twice to see a trend.</p>
  const w = 320
  const h = 140
  const pad = 30
  const ys = points.map((p) => p.y)
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  const rg = hi - lo || 1
  const X = (i: number) => pad + (i * (w - 2 * pad)) / (points.length - 1)
  const Y = (v: number) => h - pad - ((v - lo) / rg) * (h - 2 * pad)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="chart">
      <polyline fill="none" stroke="var(--ac)" strokeWidth="2.5" points={points.map((p, i) => `${X(i)},${Y(p.y)}`).join(' ')} />
      {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r="3.5" fill="var(--ac)" />)}
      <g fill="var(--mu)" fontSize="10">
        <text x="2" y={Y(hi) + 3}>{hi}</text>
        <text x="2" y={Y(lo) + 3}>{lo}</text>
        <text x={pad} y={h - 8}>{points[0].x}</text>
        <text x={w - pad} y={h - 8} textAnchor="end">{points[points.length - 1].x}</text>
      </g>
      <text x={w - 2} y="10" textAnchor="end" fontSize="10" fill="var(--mu)">{unit}</text>
    </svg>
  )
}

export function HBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span>{r.label}</span>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span className="hbar-n">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
