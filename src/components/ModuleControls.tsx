import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
export function ModuleControls({id}:{id:string}){
 const controls=MODULE_DOCUMENTS_BY_ID[id]?.controls??[]
 if(!controls.length)return <section className="detail-section"><h2>Controls</h2><p>REPITCH appears as a TIMESTRETCH mode on Flex, Static and the sample attributes page. Enable REPITCH to follow project tempo through playback speed; pitch changes along with speed.</p></section>
 return <section className="detail-section controls-section"><h2>Controls & starting values</h2><p className="service-note">Defaults from the module manifest. These settings are changed on your Octatrack.</p><dl className="control-docs">{controls.map(control=><div key={control.name}><dt>{control.name}<span>{control.labels?.[control.default]??control.default}</span></dt><dd>{control.doc}{control.labels&&control.labels.length<=8&&<small>{control.labels.join(' · ')}</small>}</dd></div>)}</dl></section>
}
