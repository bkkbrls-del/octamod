// ELF32 big-endian m68k relocatable-object reader. No code is executed.
// Relocation numbering: llvm/BinaryFormat/ELFRelocs/M68k.def (format facts).
export type CfSection = { index: number; name: string; type: number; flags: number; size: number; alignment: number; entrySize: number; data: Uint8Array }
export type CfSymbol = { index: number; name: string; value: number; size: number; binding: number; type: number; section: number }
export type CfRelocation = { section: number; offset: number; symbol: number; type: number; addend: number }
export type CfObject = { flags: number; sections: CfSection[]; symbols: CfSymbol[]; relocations: CfRelocation[] }
const widths = [0, 4, 2, 1, 4, 2, 1] as const
const LIMIT = 8 * 1024 * 1024
function failure(message: string): never { throw new Error('The ColdFire object ' + message + '.') }

export function parseColdFireObject(bytes: Uint8Array): CfObject {
  if (bytes.length < 52 || bytes.length > LIMIT) failure('has an invalid file size')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0) !== 0x7f454c46 || bytes[4] !== 1 || bytes[5] !== 2 || bytes[6] !== 1 || view.getUint16(16) !== 1 || view.getUint16(18) !== 4 || view.getUint32(20) !== 1) failure('is not an ELF32 big-endian m68k relocatable file')
  const table = view.getUint32(32), count = view.getUint16(48), namesIndex = view.getUint16(50)
  if (view.getUint16(40) !== 52 || view.getUint16(46) !== 40 || view.getUint16(44) !== 0 || !count || count > 4096 || namesIndex >= count || table < 52 || table + count * 40 > bytes.length) failure('has an invalid section table')
  function range(offset: number, size: number) {
    if (offset > bytes.length || size > bytes.length - offset) failure('has a truncated section')
    return bytes.subarray(offset, offset + size)
  }
  const headers = Array.from({ length: count }, (_, i) => {
    const offset = table + i * 40
    return { name: view.getUint32(offset), type: view.getUint32(offset + 4), flags: view.getUint32(offset + 8), offset: view.getUint32(offset + 16), size: view.getUint32(offset + 20), link: view.getUint32(offset + 24), info: view.getUint32(offset + 28), alignment: view.getUint32(offset + 32), entrySize: view.getUint32(offset + 36) }
  })
  if (headers[0].type !== 0 || headers[namesIndex].type !== 3) failure('has an invalid section-name table')
  const names = range(headers[namesIndex].offset, headers[namesIndex].size)
  function string(data: Uint8Array, offset: number) {
    if (offset >= data.length) failure('has an invalid string offset')
    const end = data.indexOf(0, offset)
    if (end < 0) failure('has an unterminated string')
    return new TextDecoder('utf-8', { fatal: true }).decode(data.subarray(offset, end))
  }
  const sections: CfSection[] = headers.map((header, index) => {
    if (header.size > 64 * 1024 * 1024 || header.alignment > 0x100000 || (header.alignment && (header.alignment & (header.alignment - 1)))) failure('has invalid section dimensions')
    return { index, name: string(names, header.name), type: header.type, flags: header.flags, size: header.size, alignment: Math.max(1, header.alignment), entrySize: header.entrySize, data: header.type === 8 ? new Uint8Array() : range(header.offset, header.size) }
  })
  const tables = headers.map((header, index) => ({ header, index })).filter(({ header }) => header.type === 2)
  if (tables.length !== 1) failure('must have one symbol table')
  const { header: symbolHeader, index: symbolTable } = tables[0]
  if (symbolHeader.entrySize !== 16 || symbolHeader.size % 16 || symbolHeader.size / 16 > 100000 || symbolHeader.link >= count || headers[symbolHeader.link].type !== 3) failure('has an invalid symbol table')
  const stringsHeader = headers[symbolHeader.link], strings = range(stringsHeader.offset, stringsHeader.size)
  const symbols = Array.from({ length: symbolHeader.size / 16 }, (_, index): CfSymbol => {
    const offset = symbolHeader.offset + index * 16, section = view.getUint16(offset + 14)
    if (section >= count && section !== 0xfff1 && section !== 0xfff2) failure('has an invalid symbol section')
    const symbol = { index, name: string(strings, view.getUint32(offset)), value: view.getUint32(offset + 4), size: view.getUint32(offset + 8), binding: bytes[offset + 12] >>> 4, type: bytes[offset + 12] & 15, section }
    if (symbol.binding > 2 || (section > 0 && section < count && symbol.value > sections[section].size)) failure('has an invalid symbol')
    return symbol
  })
  const relocations: CfRelocation[] = []
  for (const header of headers) {
    if (header.type === 9) failure('uses implicit-addend relocations which are not supported')
    if (header.type !== 4) continue
    if (header.entrySize !== 12 || header.size % 12 || header.link !== symbolTable || !header.info || header.info >= count) failure('has an invalid relocation table')
    for (let i = 0; i < header.size; i += 12) {
      const at = header.offset + i, offset = view.getUint32(at), info = view.getUint32(at + 4), symbol = info >>> 8, type = info & 255
      if (type >= widths.length) failure('uses an unsupported relocation type')
      if (symbol >= symbols.length || offset + widths[type] > sections[header.info].size || sections[header.info].type === 8) failure('has an invalid relocation target')
      relocations.push({ section: header.info, offset, symbol, type, addend: view.getInt32(at + 8) })
    }
  }
  return { flags: view.getUint32(36), sections, symbols, relocations }
}

export type CfPlacement = { address: number; mergedOffsets?: readonly { source: number; count: number; destination: number }[] }
export type CfLinkedSection = { index: number; address: number; size: number; data: Uint8Array }
export function relocateColdFireObject(object: CfObject, placements: ReadonlyMap<number, CfPlacement>, external: ReadonlyMap<string, number>): { sections: CfLinkedSection[]; exports: Map<string, number> } {
  const validAddress = (value: number) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff
  const result: CfLinkedSection[] = [], exports = new Map<string, number>()
  for (const section of object.sections) {
    if (!(section.flags & 2)) continue
    const placement = placements.get(section.index)
    if (!placement || !validAddress(placement.address) || placement.address % section.alignment || placement.address + section.size > 0x100000000) failure('has an invalid allocated-section placement')
    if (section.flags & 0x10 && !placement.mergedOffsets) failure('needs an explicit merged-section layout')
    result.push({ index: section.index, address: placement.address, size: section.size, data: section.data.slice() })
  }
  function locate(section: number, offset: number): number {
    const placement = placements.get(section)
    if (!placement) failure('refers to a section without a placement')
    if (placement.mergedOffsets) {
      const mapping = placement.mergedOffsets.find(mapping => mapping.source <= offset && offset < mapping.source + mapping.count)
      if (!mapping || !validAddress(mapping.destination + offset - mapping.source)) failure('has an unmapped merged-section reference')
      return mapping.destination + offset - mapping.source
    }
    return placement.address + offset
  }
  function symbolValue(symbol: CfSymbol, addend = 0): number {
    if (symbol.section === 0) {
      const value = external.get(symbol.name)
      if (value === undefined) { if (symbol.binding === 2) return addend; failure('has an unresolved symbol: ' + symbol.name) }
      if (!validAddress(value)) failure('has an invalid external symbol address')
      return value + addend
    }
    if (symbol.section === 0xfff1) return symbol.value + addend
    if (symbol.section === 0xfff2) {
      const value = external.get(symbol.name)
      if (value === undefined || !validAddress(value)) failure('has an unallocated common symbol')
      return value + addend
    }
    return locate(symbol.section, symbol.value + addend)
  }
  for (const symbol of object.symbols) {
    if (symbol.binding && symbol.section && symbol.name) {
      const value = symbolValue(symbol)
      if (exports.has(symbol.name)) failure('has duplicate exported symbols')
      exports.set(symbol.name, value)
    }
  }
  for (const relocation of object.relocations) {
    const section = result.find(section => section.index === relocation.section)
    if (!section || relocation.type === 0) continue
    const width = widths[relocation.type], relative = relocation.type >= 4
    const value = symbolValue(object.symbols[relocation.symbol], relocation.addend) - (relative ? locate(relocation.section, relocation.offset) : 0)
    const minimum = -(2 ** (width * 8 - 1)), maximum = relative ? 2 ** (width * 8 - 1) - 1 : 2 ** (width * 8) - 1
    if (!Number.isInteger(value) || value < minimum || value > maximum) failure('has an overflowing relocation')
    const output = new DataView(section.data.buffer)
    if (width === 4) output.setUint32(relocation.offset, value >>> 0)
    else if (width === 2) output.setUint16(relocation.offset, value & 0xffff)
    else output.setUint8(relocation.offset, value & 255)
  }
  return { sections: result, exports }
}
