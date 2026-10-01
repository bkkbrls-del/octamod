import {describe,expect,it} from 'vitest'
import {ownerMergeApproval} from './approval'
const commit='a'.repeat(40),repository='octamod/octamod',owner=42
const pull={number:7,merged:true,state:'closed',merge_commit_sha:commit,merged_at:'2026-10-01T01:00:00Z',base:{ref:'main',repo:{full_name:repository}},merged_by:{id:owner,login:'module-owner'}}
describe('PR merge is version approval',()=>{
 it('binds approval to the exact merged commit and immutable owner ID',()=>expect(ownerMergeApproval(pull,repository,commit,owner)).toMatchObject({sourceCommit:commit,pullRequest:7,mergedById:42,baseRef:'main'}))
 it('rejects open PRs, another merger and changed source after approval',()=>{
  for(const value of [{...pull,merged:false},{...pull,state:'open'},{...pull,merged_by:{id:43,login:'module-owner'}},{...pull,merge_commit_sha:'b'.repeat(40)}])expect(()=>ownerMergeApproval(value,repository,commit,owner)).toThrow('owner-merged')
 })
 it('rejects a merge in another repository or branch',()=>{
  for(const base of [{...pull.base,ref:'development'},{ref:'main',repo:{full_name:'other/project'}}])expect(()=>ownerMergeApproval({...pull,base},repository,commit,owner)).toThrow('owner-merged')
 })
 it('requires exact commit IDs and a configured owner',()=>{
  expect(()=>ownerMergeApproval(pull,repository,'main',owner)).toThrow('immutable')
  expect(()=>ownerMergeApproval(pull,repository,commit,0)).toThrow('immutable')
 })
})
