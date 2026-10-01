import { relative, isAbsolute } from 'node:path'

/** True when `realPath` is outside `folder` (including symlink escapes). */
export function escapesModuleFolder(folder: string, realPath: string): boolean {
  const rel = relative(folder, realPath)
  if (rel === '') return false
  if (isAbsolute(rel)) return true
  return rel.split(/[\\/]/).includes('..')
}
