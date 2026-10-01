import { RESOURCES, resourceSource } from '../catalog/resources'
export function ModuleResources({ id }: { id: string }) {
  const data = RESOURCES[id]
  return <>
    <section className="detail-section resource-section"><div className="section-title"><h2>Storage & processing</h2><span className="subtle">Recorded: {data.measured}</span></div><div className="resource-grid">{[data.memory, data.compute].map(metric => <div className="resource-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.note}</p></div>)}</div><p className="resource-note">Final firmware size and combined load depend on the selected modules and active tracks. The builder must measure the complete configuration. <a href={resourceSource(id)} target="_blank" rel="noreferrer">Read the measurement record ↗</a></p></section>
    <section className="detail-section"><h2>How to use it</h2><ol className="usage-list">{data.usage.map(step => <li key={step}>{step}</li>)}</ol></section>
    <section className="quality-note"><h2>Test evidence & hardware status</h2><p>{data.quality}</p><a href={resourceSource(id)} target="_blank" rel="noreferrer">Source and test details ↗</a></section>
    <aside className="risk-note"><strong>Custom firmware · flash at your own risk</strong><p>Custom firmware can make your Octatrack unusable or cause project and data loss. Back up your projects and samples, read the module’s compatibility notes, and keep the original firmware. Passing tests does not guarantee safe operation on every device or configuration.</p></aside>
  </>
}
