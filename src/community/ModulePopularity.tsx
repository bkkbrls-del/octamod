import { Icon } from '../components/Icon'
import { downloadCoverage } from './module-statistics'
export function ModulePopularity({statistics}:{statistics?:{likes:number;downloads?:number;downloadsStarted?:string|null}}) {
  return <div className="module-popularity"><span><Icon name="heart" size={13}/>{statistics ? statistics.likes.toLocaleString() : '—'} {statistics?.likes === 1 ? 'like' : 'likes'}</span><span title={downloadCoverage(statistics?.downloadsStarted)}><Icon name="download" size={13}/>{statistics?.downloads === undefined ? '—' : statistics.downloads.toLocaleString()} {statistics?.downloads === 1 ? 'download' : 'downloads'}</span></div>
}
