import { useEffect, useRef } from 'react'
import { MODULES } from '../catalog/modules'
import { DETAILS } from '../catalog/details'
import { RESOURCES } from '../catalog/resources'
import metadata from '../catalog/native-metadata.json'
export function ModuleComparison({ids,onClose,onToggle,selected}:{ids:string[];onClose:()=>void;onToggle:(id:string)=>void;selected:string[]}){
 const ref=useRef<HTMLDialogElement>(null),modules=MODULES.filter(m=>ids.includes(m.id))
 const records:Record<string,{proof:string}>=metadata.modules
 useEffect(()=>{ref.current?.showModal()},[])
 return <dialog ref={ref} className="comparison-dialog" aria-labelledby="comparison-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose()}}><div className="section-title"><h2 id="comparison-title">Compare modules</h2><button className="icon-button" onClick={onClose} aria-label="Close comparison">×</button></div><div className="comparison-scroll" tabIndex={0} role="region" aria-label="Module comparison table"><table><thead><tr><th scope="col">Module</th>{modules.map(m=><th scope="col" key={m.id}><a href={'#module/'+m.id} onClick={onClose}>{m.name} ↗</a><small>by {m.author}</small></th>)}</tr></thead><tbody>{['Purpose','Location','Storage','Processing','Hardware record'].map(label=><tr key={label}><th scope="row">{label}</th>{modules.map(m=><td key={m.id}>{label==='Purpose'?m.description:label==='Location'?m.detail:label==='Storage'?RESOURCES[m.id].memory.value:label==='Processing'?RESOURCES[m.id].compute.value:records[m.id].proof==='hardware'?'Earlier hardware evidence; current catalog unqualified':'No hardware qualification'}</td>)}</tr>)}<tr><th scope="row">Configuration</th>{modules.map(m=><td key={m.id}><button className="button button-quiet" aria-pressed={selected.includes(m.id)} onClick={()=>onToggle(m.id)}>{selected.includes(m.id)?'Added':'Add '+m.name}</button></td>)}</tr></tbody></table></div><p className="service-note">Storage and processing values use different measurement methods. Open each module for conditions and test evidence. {modules.map(m=>DETAILS[m.id].family).join(' · ')}</p></dialog>
}
