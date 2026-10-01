// DSP record format adapted from octabam's MIT-licensed dsp_modmap.py.
// Words are read from the user's local OS image, never bundled with the app.
export type DspSpace = 0 | 1 | 2
export type DspRecord = { space: DspSpace; address: number; count: number; dataOffset: number }
export type DspMemory = { bytes: Uint8Array; prefixLength: number; trailerOffset: number; records: readonly DspRecord[] }

function word(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 3 > bytes.length) throw new Error('The DSP payload is truncated.')
  return bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16
}

// The verified 1.40C payloads use [space, address, count], each LE24.
export function parseDspMemory(bytes: Uint8Array): DspMemory {
  let cursor = 0
  for (const tag of [3, 4]) {
    if (cursor + 6 <= bytes.length && word(bytes, cursor) === tag) cursor += 6
  }
  const prefixLength = cursor, records: DspRecord[] = []
  while (cursor + 9 <= bytes.length) {
    const space = word(bytes, cursor), address = word(bytes, cursor + 3), count = word(bytes, cursor + 6)
    if (space > 2) throw new Error('The DSP payload has an invalid memory space.')
    if (!count || count > 0x20000 || address + count > 0x1000000) throw new Error('The DSP payload has an invalid memory range.')
    const dataOffset = cursor + 9, end = dataOffset + count * 3
    if (end > bytes.length) throw new Error('The DSP payload record is truncated.')
    if (records.some(record => record.space === space && address < record.address + record.count && record.address < address + count)) throw new Error('The DSP payload has overlapping memory records.')
    records.push({ space: space as DspSpace, address, count, dataOffset })
    cursor = end
  }
  if (!records.length || bytes.length - cursor !== 6 || word(bytes, cursor) !== 3) throw new Error('The DSP payload terminator is invalid.')
  return { bytes, prefixLength, trailerOffset: cursor, records }
}

function spans(memory: DspMemory, space: DspSpace, address: number, count: number) {
  if (![0, 1, 2].includes(space) || !Number.isInteger(address) || !Number.isInteger(count) || address < 0 || count < 0 || count > 0x20000 || address + count > 0x1000000) throw new Error('The requested DSP memory range is invalid.')
  const result: { dataOffset: number; count: number }[] = []
  let position = address, remaining = count
  while (remaining) {
    const record = memory.records.find(record => record.space === space && record.address <= position && position < record.address + record.count)
    if (!record) throw new Error('The requested DSP memory range is not loaded by this payload.')
    const size = Math.min(remaining, record.address + record.count - position)
    result.push({ dataOffset: record.dataOffset + (position - record.address) * 3, count: size })
    position += size; remaining -= size
  }
  return result
}

export function readDspWords(memory: DspMemory, space: DspSpace, address: number, count: number): Uint32Array {
  const result = new Uint32Array(count >= 0 && Number.isInteger(count) && count <= 0x20000 ? count : 0)
  let index = 0
  for (const span of spans(memory, space, address, count)) for (let i = 0; i < span.count; i++) result[index++] = word(memory.bytes, span.dataOffset + i * 3)
  return result
}

export function writeDspWords(memory: DspMemory, space: DspSpace, address: number, words: Uint32Array): void {
  const ranges = spans(memory, space, address, words.length)
  if (words.some(word => word > 0xffffff)) throw new Error('The DSP write contains a word wider than 24 bits.')
  let index = 0
  for (const span of ranges) for (let i = 0; i < span.count; i++) {
    const value = words[index++], offset = span.dataOffset + i * 3
    memory.bytes[offset] = value; memory.bytes[offset + 1] = value >>> 8; memory.bytes[offset + 2] = value >>> 16
  }
}
