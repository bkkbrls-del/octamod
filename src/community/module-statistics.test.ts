import { describe, expect, it } from 'vitest'
import { compareModules, type ModuleStatistics } from './module-statistics'
const modules=[{id:'a',name:'Alpha',authorName:'Zed'},{id:'b',name:'Beta',authorName:'Amy'},{id:'c',name:'Gamma',authorName:'Amy'}]
const statistics:ModuleStatistics[]=[{module_id:'a',average:5,count:1,likes:2,downloads:7,downloadsStarted:null},{module_id:'b',average:0,count:0,likes:8,downloads:1,downloadsStarted:null},{module_id:'c',average:4,count:1,likes:8,downloads:15,downloadsStarted:null}]
describe('module discovery ordering',()=>{
 it.each([['downloaded',['c','a','b']],['liked',['b','c','a']],['rated',['a','c','b']],['author',['b','c','a']],['name',['a','b','c']],['collection',['a','b','c']]])('orders modules by %s with stable alphabetical ties',(sort,expected)=>{
  expect([...modules].sort((a,b)=>compareModules(a,b,sort as string,statistics)).map(module=>module.id)).toEqual(expected)
 })
 it('handles missing statistics and unrated modules without changing the selection or input catalog',()=>{
  const filtered=[modules[2],modules[0]]
  expect([...filtered].sort((a,b)=>compareModules(a,b,'downloaded',statistics)).map(module=>module.id)).toEqual(['c','a'])
  expect([...filtered].sort((a,b)=>compareModules(a,b,'liked',null)).map(module=>module.id)).toEqual(['a','c'])
  expect(filtered.map(module=>module.id)).toEqual(['c','a'])
 })
})
