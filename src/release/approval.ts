export type MergeApproval = {
  kind: 'github-pr-merge'; repository: string; sourceCommit: string; baseRef: 'main'
  pullRequest: number; mergedBy: string; mergedById: number; moduleApproverId: number; mergedAt: string
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function releaseIdentity(repository: string, commit: string, ownerId: number) {
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(commit) || !Number.isSafeInteger(ownerId) || ownerId < 1) throw new Error('Configure an exact repository, source commit and immutable owner GitHub ID.')
}
export function ownerMergeApproval(pull: unknown, repository: string, commit: string, ownerId: number): MergeApproval {
  releaseIdentity(repository, commit, ownerId)
  const pr=object(pull),base=object(pr.base),repo=object(base.repo),merger=object(pr.merged_by)
  if (pr.merged !== true || pr.state !== 'closed' || pr.merge_commit_sha !== commit || base.ref !== 'main' || typeof repo.full_name !== 'string' || repo.full_name.toLowerCase() !== repository.toLowerCase() || merger.id !== ownerId || typeof merger.login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(merger.login) || typeof pr.number !== 'number' || !Number.isSafeInteger(pr.number) || pr.number < 1 || typeof pr.merged_at !== 'string' || !Number.isFinite(Date.parse(pr.merged_at))) throw new Error('This exact main commit was not introduced by an owner-merged PR.')
  return {kind:'github-pr-merge',repository,sourceCommit:commit,baseRef:'main',pullRequest:pr.number,mergedBy:merger.login,mergedById:ownerId,moduleApproverId:ownerId,mergedAt:pr.merged_at}
}
export async function fetchOwnerApproval(repository: string, commit: string, ownerId: number, token=''): Promise<MergeApproval> {
  releaseIdentity(repository,commit,ownerId)
  const headers: Record<string,string>={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'}
  if(token)headers.Authorization='Bearer '+token
  async function get(path:string) {
    const response=await fetch('https://api.github.com/repos/'+repository+path,{headers,redirect:'error',signal:AbortSignal.timeout(10000)})
    if(!response.ok)throw new Error('GitHub approval lookup failed: HTTP '+response.status)
    const text=await response.text();if(text.length>4*1024*1024)throw new Error('GitHub approval response is too large.')
    return JSON.parse(text) as unknown
  }
  const list=await get('/commits/'+commit+'/pulls?per_page=100')
  if(!Array.isArray(list))throw new Error('GitHub did not return associated PRs.')
  for(const item of list){const number=object(item).number;if(typeof number!=='number'||!Number.isSafeInteger(number)||number<1)continue
    const pull=await get('/pulls/'+number)
    try{return ownerMergeApproval(pull,repository,commit,ownerId)}catch{/* Associated open/stale PRs cannot approve this commit. */}
  }
  throw new Error('No owner-merged PR approves this exact main commit; keep the previous publication.')
}
