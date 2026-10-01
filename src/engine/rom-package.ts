import { validateCompiledPackage } from './module-build.ts'
// Authored modules only. Stock guards remain hashes, never copied instructions.
import packages from './assets/rom-packages.json' with { type: 'json' }
import { CATALOG_SOURCE, MODULES } from '../catalog/modules.ts'
import { parseColdFireObject, relocateColdFireObject, type CfObject } from './coldfire-elf.ts'
export async function readRomPackage(label: string): Promise<CfObject> {
  if (packages.schema !== 1 || packages.revision !== CATALOG_SOURCE.revision) throw new Error('ROM packages do not match the pinned catalog.')
  const pkg = packages.packages.find(pkg => pkg.label === label)
  if (!pkg) throw new Error('Unknown ROM package: ' + label)
  const module = MODULES.find(module => module.id === pkg.moduleId)
  const shared = label === 'wide-dial' && pkg.moduleId === null && pkg.key === 'shared-wide-dial' && pkg.author === 'sambanks'
  if (!shared && (!module || module.key !== pkg.key || module.author !== pkg.author)) throw new Error('ROM package attribution does not match its catalog entry.')
  if (!shared && pkg.moduleId) validateCompiledPackage(pkg.moduleId, pkg.version)
  if (!['5407','5475'].includes(pkg.cpu) || pkg.bytes < 52 || pkg.bytes > 65536 || !Number.isInteger(pkg.bytes) || pkg.code.length !== pkg.bytes * 2 || !/^[0-9a-f]+$/.test(pkg.code)) throw new Error('The ROM package has invalid object bytes.')
  const bytes = Uint8Array.from({ length: pkg.bytes }, (_, i) => parseInt(pkg.code.slice(i * 2, i * 2 + 2), 16))
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer)
  if (Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') !== pkg.sha256) throw new Error('The ROM object checksum does not match.')
  return parseColdFireObject(bytes)
}
export function linkRomText(object: CfObject, base: number, external: ReadonlyMap<string, number> = new Map()) {
  const text = object.sections.find(section => section.name === '.text')
  if (!text || text.type !== 1 || text.flags !== 6 || !text.size || text.size > 65536 || text.data.length !== text.size || object.sections.some(section => section.flags & 2 && section.index !== text.index && section.size)) throw new Error('The ROM object needs a reviewed placement profile for its allocated sections.')
  if (!Number.isInteger(base) || base < 0 || base % Math.max(2, text.alignment) || base + text.size > 0x100000000) throw new Error('The ROM text has an invalid origin.')
  const placements = new Map(object.sections.filter(section => section.flags & 2).map(section => [section.index, { address: section.index === text.index ? base : Math.ceil((base + text.size) / section.alignment) * section.alignment }]))
  const linked = relocateColdFireObject(object, placements, external)
  return { bytes: linked.sections.find(section => section.index === text.index)!.data, symbols: linked.exports }
}
export async function createWideDial(rows: readonly (readonly [number, number])[], base: number) {
  if (!rows.length || rows.length > 128 || new Set(rows.map(row => row[0])).size !== rows.length || rows.some(([address, maximum]) => !Number.isInteger(address) || address < 0 || address > 0xfffffffe || address % 2 || !Number.isInteger(maximum) || maximum < 5 || maximum > 127)) throw new Error('The wide dial has invalid formatter rows.')
  const object = await readRomPackage('wide-dial'), text = object.sections.find(section => section.name === '.text')!, table = object.symbols.find(symbol => symbol.name === 'wide_dial_table')
  if (!table || table.section !== text.index || table.value % 4 || table.value + 8 !== text.size || text.data.subarray(table.value).some(byte => byte)) throw new Error('The wide dial template has an unsupported table layout.')
  const bytes = new Uint8Array(table.value + (rows.length + 1) * 8); bytes.set(text.data.subarray(0, table.value))
  const view = new DataView(bytes.buffer)
  for (const [i, [address, maximum]] of rows.entries()) { view.setUint32(table.value + i * 8, address); view.setUint32(table.value + i * 8 + 4, maximum) }
  text.data = bytes; text.size = bytes.length
  return linkRomText(object, base)
}
