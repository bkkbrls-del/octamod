// Authored ColdFire formatter emitters, ported from octabam's label_fmt.py
// and mode_names.py. Sam Banks; MIT, /licenses/octabam.txt.
export type ModeRenames = Readonly<Record<number, Readonly<Record<number, string>>>>
const SPRINTF = 0x40013a08
function long(value: number) { return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255] }
function word(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 65535) throw new Error('A formatter table exceeds its 16-bit offsets.')
  return [value >>> 8, value & 255]
}
function checkLabels(labels: readonly string[]) {
  if (!labels.length || labels.length > 128) throw new Error('A select needs between 1 and 128 labels.')
  for (const label of labels) if ([...label].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126) || label.includes('%')) throw new Error('A formatter label must be printable ASCII without format conversions.')
}
function strings(labels: readonly string[]) {
  let offset = labels.length * 2
  const table: number[] = [], data: number[] = []
  for (const label of labels) {
    table.push(...word(offset))
    for (const char of label) data.push(char.charCodeAt(0))
    data.push(0); offset += label.length + 1
  }
  if (offset > 65535) throw new Error('A formatter string table exceeds its 16-bit offsets.')
  return [...table, ...data]
}
function padded(bytes: number[]) {
  if (bytes.length % 2) bytes.push(0)
  return Uint8Array.from(bytes)
}
export function emitLabelFormatter(labels: readonly string[]): Uint8Array {
  checkLabels(labels)
  return padded([
    0x20,0x2f,0x00,0x08,0x0c,0x80,...long(labels.length),0x65,0x02,0x70,0x00,
    0x41,0xfa,0x00,0x18,0x32,0x30,0x0a,0x00,0x02,0x81,0x00,0x00,0xff,0xff,
    0xd1,0xc1,0x2f,0x48,0x00,0x08,0x4e,0xf9,...long(SPRINTF),...strings(labels),
  ])
}
export function emitModeFormatter(labels: readonly string[], namesAddress: number, renames: ModeRenames): Uint8Array {
  checkLabels(labels)
  if (!Number.isInteger(namesAddress) || namesAddress < 0 || namesAddress % 2 || namesAddress + 72 > 0x100000000) throw new Error('A formatter names table has an invalid address.')
  for (const mode of Object.keys(renames)) if (!/^(0|[1-9][0-9]*)$/.test(mode) || Number(mode) >= labels.length) throw new Error('A formatter rename refers to an invalid mode.')
  const records: number[] = [], table: number[] = []
  for (let mode = 0; mode < labels.length; mode++) {
    table.push(...word(labels.length * 2 + records.length))
    const names = renames[mode] ?? {}
    for (const slot of Object.keys(names).sort((a, b) => Number(a) - Number(b))) {
      if (!/^(0|[1-9][0-9]*)$/.test(slot) || Number(slot) > 11) throw new Error('A formatter rename refers to an invalid parameter slot.')
      const name = names[Number(slot)]
      if (name.length > 5 || [...name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) > 255)) throw new Error('A formatter parameter name must fit its terminated six-byte field.')
      records.push(Number(slot), 0)
      for (let i = 0; i < 6; i++) records.push(i < name.length ? name.charCodeAt(i) : 0)
    }
    records.push(255, 0, 0, 0, 0, 0, 0, 0)
  }
  const displacement = 24 + table.length + records.length
  if (displacement > 32767) throw new Error('A formatter rename table exceeds its signed PC-relative displacement.')
  return padded([
    0x20,0x2f,0x00,0x08,0x0c,0x80,...long(labels.length),0x65,0x02,0x70,0x00,
    0x43,0xfa,0x00,0x4a,0x32,0x31,0x0a,0x00,0x02,0x81,0x00,0x00,0xff,0xff,
    0xd3,0xc1,0x12,0x19,0x0c,0x01,0x00,0xff,0x67,0x1a,0x52,0x89,
    0x02,0x81,0x00,0x00,0x00,0xff,0xc2,0xfc,0x00,0x06,0x41,0xf9,...long(namesAddress),
    0xd1,0xc1,0x20,0xd9,0x30,0xd9,0x60,0xde,0x41,0xfa,...word(displacement),
    0x32,0x30,0x0a,0x00,0x02,0x81,0x00,0x00,0xff,0xff,0xd1,0xc1,
    0x2f,0x48,0x00,0x08,0x4e,0xf9,...long(SPRINTF),...table,...records,...strings(labels),
  ])
}
