// Port of octabam's runtime encoder, derived from June Kiff's MIT-licensed
// Octakit packer. Licenses: /licenses/ems-octakit.txt and /licenses/octabam.txt.
// This greedy encoder is distinct from the stock OS section's cost parser.
import { MAX_SECTION_SIZE, unpackSection } from './aplib.ts'
export const RUNTIME_PACK_CANDIDATES = 4096
const FAR_OFFSET = 0x0d00, MAX_MATCH = 0x8000

class StreamWriter {
  private readonly output: Uint8Array
  private size = 0
  private tagPosition = 0
  private remaining = 0
  constructor(length: number) { this.output = new Uint8Array(Math.ceil(length * 1.5) + 256) }
  bit(value: number) {
    if (this.remaining === 0) { this.tagPosition = this.size++; this.remaining = 8 }
    if (value & 1) this.output[this.tagPosition] |= 1 << (this.remaining - 1)
    this.remaining--
  }
  byte(value: number) { this.output[this.size++] = value }
  gamma(value: number) {
    for (let bit = 30 - Math.clz32(value); bit >= 0; bit--) { this.bit(value >>> bit); this.bit(bit === 0 ? 1 : 0) }
  }
  finish() { return this.output.slice(0, this.size) }
}

export function packRuntimeStream(data: Uint8Array, maxCandidates = RUNTIME_PACK_CANDIDATES): Uint8Array {
  if (!data.length || data.length > MAX_SECTION_SIZE) throw new Error('The runtime has an invalid size.')
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > RUNTIME_PACK_CANDIDATES) throw new Error('The runtime candidate limit is invalid.')
  const head3 = new Int32Array(1 << 20).fill(-1), head2 = new Int32Array(1 << 16).fill(-1)
  const chain3 = new Int32Array(data.length).fill(-1), writer = new StreamWriter(data.length)
  const hash2 = (at: number) => data[at] * 256 + data[at + 1]
  const hash3 = (at: number) => (Math.imul((data[at] << 16) | (data[at + 1] << 8) | data[at + 2], 2654435761) >>> 12) & 0xfffff
  function matchLength(candidate: number, position: number) {
    const offset = position - candidate, limit = Math.min(data.length - position, MAX_MATCH), direct = Math.min(offset, limit)
    let count = 0
    while (count < direct && data[candidate + count] === data[position + count]) count++
    if (count === direct) while (count < limit && data[candidate + count % offset] === data[position + count]) count++
    return count
  }
  let position = 0, lastOffset: number | undefined
  while (position < data.length) {
    let bestOffset = 0, bestLength = 0
    if (position + 2 < data.length) {
      let candidate = head3[hash3(position)], tried = 0
      while (candidate >= 0 && tried < maxCandidates) {
        const offset = position - candidate, length = matchLength(candidate, position), minimum = offset > FAR_OFFSET ? 3 : 2
        if (length >= minimum && length > bestLength) {
          bestOffset = offset; bestLength = length
          if (bestLength === MAX_MATCH) break
        }
        candidate = chain3[candidate]; tried++
      }
    }
    if (bestLength < 2 && position + 1 < data.length) {
      const candidate = head2[hash2(position)]
      if (candidate >= 0 && position - candidate <= FAR_OFFSET) { bestOffset = position - candidate; bestLength = 2 }
    }
    if (bestLength < 2) { writer.bit(1); writer.byte(data[position]) }
    else {
      writer.bit(0)
      if (bestOffset === lastOffset) writer.gamma(2)
      else { const raw = bestOffset + 767; writer.gamma(raw >>> 8); writer.byte(raw & 255) }
      const lengthRead = bestLength - (bestOffset > FAR_OFFSET ? 2 : 1)
      if (lengthRead <= 3) { writer.bit(lengthRead >>> 1); writer.bit(lengthRead) }
      else { writer.bit(0); writer.bit(0); writer.gamma(lengthRead - 2) }
      lastOffset = bestOffset
    }
    const end = position + Math.max(1, bestLength)
    // Include every position crossed by a match, preserving native chain order.
    while (position < end) {
      if (position + 1 < data.length) head2[hash2(position)] = position
      if (position + 2 < data.length) { const key = hash3(position); chain3[position] = head3[key]; head3[key] = position }
      position++
    }
  }
  writer.bit(0); writer.gamma(0x01000002); writer.byte(255)
  return writer.finish()
}

export function packGka3(data: Uint8Array): Uint8Array {
  const stream = packRuntimeStream(data), result = new Uint8Array(stream.length + 8), header = new DataView(result.buffer)
  header.setUint32(0, 0x474b4133); header.setUint32(4, data.length); result.set(stream, 8)
  return result
}

export function unpackGka3(packed: Uint8Array): Uint8Array {
  if (packed.length < 9 || packed.length > MAX_SECTION_SIZE * 1.5 + 256) throw new Error('The packed runtime has an invalid size.')
  const header = new DataView(packed.buffer, packed.byteOffset, packed.byteLength), length = header.getUint32(4)
  if (header.getUint32(0) !== 0x474b4133 || !length || length > MAX_SECTION_SIZE) throw new Error('The packed runtime header is invalid.')
  // The stream format is shared. Supply the section decoder's local envelope;
  // the boot loader independently checks rolling hashes of packed and raw data.
  const section = packed.slice(), envelope = new DataView(section.buffer)
  let sum = 0
  for (const byte of section.subarray(8)) sum = (sum + byte) >>> 0
  envelope.setUint32(0, section.length - 8); envelope.setUint32(4, sum)
  const result = unpackSection(section, length)
  if (result.length !== length) throw new Error('The decoded runtime size does not match its header.')
  return result
}
