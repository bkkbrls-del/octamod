import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { escapesModuleFolder } from './module-folder'

describe('module folder path guard', () => {
  const folder = resolve('/tmp/octamod-modules/midi-scenes')

  it('accepts nested files and names that start with .. on POSIX-style paths', () => {
    expect(escapesModuleFolder(folder, resolve(folder, 'README.md'))).toBe(false)
    expect(escapesModuleFolder(folder, resolve(folder, 'upstream/gas/msc.s'))).toBe(false)
    expect(escapesModuleFolder(folder, resolve(folder, '..notes.md'))).toBe(false)
    expect(escapesModuleFolder(folder, resolve(folder, 'docs/..legacy.txt'))).toBe(false)
  })

  it('rejects parent escapes on POSIX-style paths', () => {
    expect(escapesModuleFolder(folder, resolve(folder, '..', 'other', 'x.md'))).toBe(true)
    expect(escapesModuleFolder(folder, resolve('/tmp/octamod-modules/other/x.md'))).toBe(true)
  })

  it('accepts nested files and ..-prefixed names on Windows-style paths', () => {
    const win = 'C:\\repo\\sdk\\octabam\\modules\\midi-scenes'
    expect(escapesModuleFolder(win, win + '\\README.md')).toBe(false)
    expect(escapesModuleFolder(win, win + '\\upstream\\gas\\msc.s')).toBe(false)
    expect(escapesModuleFolder(win, win + '\\..notes.md')).toBe(false)
    expect(escapesModuleFolder(win, win + '\\docs\\..legacy.txt')).toBe(false)
  })

  it('rejects parent escapes and absolute jumps on Windows-style paths', () => {
    const win = 'C:\\repo\\sdk\\octabam\\modules\\midi-scenes'
    expect(escapesModuleFolder(win, 'C:\\repo\\sdk\\octabam\\modules\\other\\x.md')).toBe(true)
    expect(escapesModuleFolder(win, 'D:\\outside\\x.md')).toBe(true)
    // relative() may yield ..\other\x.md
    expect(escapesModuleFolder(win, win + '\\..\\other\\x.md')).toBe(true)
  })
})
