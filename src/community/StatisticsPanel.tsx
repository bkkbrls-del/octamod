import { useEffect, useState } from 'react'
import { api } from './api'
import type { UsageDay, UsageStatistics } from './usage-contract'

const format = (value: number) => value.toLocaleString()
const metrics = [
  ['page_views', 'Page views'],
  ['configurations', 'Configurations started'],
  ['builds', 'Successful builds'],
  ['downloads', 'Firmware download requests'],
  ['exports', 'Configuration exports'],
] as const

function dailyRows(data: UsageStatistics): { day: string; counts: UsageDay | null }[] {
  return Array.from({ length: data.days }, (_, index) => {
    const date = new Date(data.from + 'T00:00:00Z')
    date.setUTCDate(date.getUTCDate() + index)
    const day = date.toISOString().slice(0, 10)
    const counts = !data.collectionStarted || day < data.collectionStarted.slice(0, 10)
      ? null
      : data.rows.find(row => row.day === day) ?? { day, visitors: 0, page_views: 0, configurations: 0, builds: 0, downloads: 0, exports: 0 }
    return { day, counts }
  })
}

export function StatisticsPanel() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<UsageStatistics | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    void api<UsageStatistics>('/admin/statistics?days=' + days)
      .then(value => { if (active) setData(value) })
      .catch(error => { if (active) { setData(null); setError(error.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [days, refresh])

  const current = data?.days === days ? data : null
  const covered = !!current?.collectionStarted
  const rows = current ? dailyRows(current) : []
  const max = Math.max(1, ...rows.map(row => row.counts?.visitors ?? 0))
  const today = current?.rows.find(row => row.day === current.to)?.visitors ?? 0

  return <section className="configuration-section usage-statistics" aria-busy={loading}>
    <div className="section-title">
      <div><h2>Site statistics</h2><p className="service-note">Anonymous browser-reported counts · UTC days</p></div>
      <div className="statistics-controls">
        <label>Period<select value={days} onChange={event => { setDays(Number(event.target.value)); setLoading(true); setError('') }}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select></label>
        <button className="button button-quiet" disabled={loading} onClick={() => { setRefresh(value => value + 1); setLoading(true); setError('') }}>Refresh</button>
      </div>
    </div>
    {error ? <p role="alert" className="file-error">{error}</p> : loading ? <p role="status">Loading usage counts…</p> : current && <>
      <dl className="admin-overview statistics-cards">
        <div><dt>Visitors today</dt><dd>{covered ? format(today) : '—'}</dd><small>Unique daily browser identifiers</small></div>
        {metrics.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{covered ? format(current.rows.reduce((sum, row) => sum + row[key], 0)) : '—'}</dd><small>Selected period</small></div>)}
      </dl>
      {covered ? <>
        <p className="service-note">Collection began {new Date(current.collectionStarted!).toLocaleString(undefined, { timeZone: 'UTC' })} UTC · Updated {new Date(current.generatedAt).toLocaleTimeString(undefined, { timeZone: 'UTC' })} UTC. Earlier traffic is unavailable.</p>
        <figure className="visitors-chart">
          <figcaption>Daily visitors · {days} days</figcaption>
          <div className="visitors-bars" role="img" aria-label="Daily visitor counts; exact values are in the table below.">
            {rows.map(({ day, counts }) => <span key={day} title={counts ? day + ': ' + counts.visitors + ' visitors' : 'Before collection began'} className={counts ? '' : 'uncollected'} style={{ height: counts ? (counts.visitors ? Math.max(2, counts.visitors / max * 100) : 0) + '%' : '2%' }} />)}
          </div>
          <div className="chart-dates"><span>{current.from}</span><span>{current.to}</span></div>
        </figure>
        <div className="statistics-table" role="region" aria-label="Daily usage counts" tabIndex={0}>
          <table>
            <caption>Daily counts · UTC · — means collection had not begun</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Visitors</th>{metrics.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
            <tbody>{rows.map(({ day, counts }) => <tr key={day}><th scope="row">{day}</th><td>{counts ? format(counts.visitors) : '—'}</td>{metrics.map(([key]) => <td key={key}>{counts ? format(counts[key]) : '—'}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </> : <p className="service-note" role="status">Waiting for the first recorded visit. Collection starts with this release; earlier traffic is unavailable.</p>}
      <details className="statistics-definitions">
        <summary>How these counts work</summary>
        <p>Visitors are distinct browser identifiers within one UTC day. The identifier changes daily, so daily visitors cannot be added together to count unique people across a period.</p>
        <p>A configuration starts when its first module is added, or when a nonempty configuration is imported or duplicated. Only successful completed local builds count. Download requests count clicks; they do not prove the file was saved or flashed.</p>
        <p>Blocked tracking, browser privacy preferences, offline use and automated traffic affect coverage. Today is incomplete. No firmware, configuration contents, guest identity, IP address, user agent or referrer is stored with these counts.</p>
      </details>
    </>}
  </section>
}
