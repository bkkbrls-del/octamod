import metadata from './native-metadata.json'
import { CATALOG_SOURCE, resolveSelection } from './modules'
import { moduleBuildError } from './build-support'
export function checkSelection(ids:readonly string[]){
 const modules=resolveSelection(ids)
 if(!modules.length)return {issues:[],checked:false}
 const pending=moduleBuildError(ids)
 if(pending)return {issues:[pending],checked:false}
 if(metadata.revision!==CATALOG_SOURCE.revision)return {issues:['Compatibility metadata does not match this catalog revision.'],checked:false}
 const key=modules.map(m=>m.id).sort().join('+')
 const checks:Record<string,string[]>=metadata.checks
 return {issues:checks[key]??['This selection has no recorded declaration check.'],checked:key in checks}
}
