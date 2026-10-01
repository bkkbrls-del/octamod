// ELEK layout adapted from Marcel Bierling's independent firmware tool (MIT).
// See /licenses/elektron-firmware-tool.txt; header and tail come from the user.
import { packSection, unpackSection } from './aplib.ts'
import { decodeElup, encodeElup } from './elup.ts'

const SECTION_OFFSET = 18
export type FirmwareContainer = {
  header: Uint8Array
  mainOs: Uint8Array
  tail: Uint8Array
}
export type DecodedFirmware = FirmwareContainer & { seed: number }

export function decodeContainer(container: Uint8Array): FirmwareContainer {
  if (container.length < SECTION_OFFSET + 8 || String.fromCharCode(...container.subarray(0, 4)) !== 'ELEK') {
    throw new Error('The firmware container header is invalid.')
  }
  const view = new DataView(container.buffer, container.byteOffset, container.byteLength)
  const sectionEnd = SECTION_OFFSET + 8 + view.getUint32(SECTION_OFFSET)
  if (sectionEnd > container.length) throw new Error('The firmware container section is truncated.')
  const mainOs = unpackSection(container.subarray(SECTION_OFFSET, sectionEnd))
  if (mainOs.length === 0) throw new Error('The firmware container has no operating-system data.')
  return { header: container.slice(0, SECTION_OFFSET), mainOs, tail: container.slice(sectionEnd) }
}

export function encodeContainer(stock: FirmwareContainer, mainOs: Uint8Array, version?: string): Uint8Array {
  if (stock.header.length !== SECTION_OFFSET || String.fromCharCode(...stock.header.subarray(0, 4)) !== 'ELEK') {
    throw new Error('The stock firmware container header is invalid.')
  }
  if (mainOs.length === 0) throw new Error('The firmware container has no operating-system data.')
  if (stock.tail.length > 1024 * 1024) throw new Error('The stock firmware container tail exceeds its size limit.')
  if (version !== undefined && !/^[A-Za-z0-9. ]{1,10}$/.test(version)) throw new Error('The firmware version must contain 1–10 letters, numbers, spaces or dots.')
  const packed = packSection(mainOs)
  const result = new Uint8Array(SECTION_OFFSET + packed.length + stock.tail.length)
  result.set(stock.header)
  if (version !== undefined) {
    result.fill(32, 8, SECTION_OFFSET)
    result.set(new TextEncoder().encode(version), 8)
  }
  result.set(packed, SECTION_OFFSET); result.set(stock.tail, SECTION_OFFSET + packed.length)
  return result
}

export function decodeFirmware(update: Uint8Array): DecodedFirmware {
  const { container, seed } = decodeElup(update)
  return { ...decodeContainer(container), seed }
}

// Packaging is deliberately separate from module composition. Its existence
// must never enable the download button or present unchanged stock as a remix.
export function encodeFirmware(stock: DecodedFirmware, mainOs: Uint8Array, version: string): Uint8Array {
  const result = encodeElup(encodeContainer(stock, mainOs, version), stock.seed)
  const restored = decodeFirmware(result)
  if (restored.mainOs.length !== mainOs.length || !mainOs.every((byte, i) => restored.mainOs[i] === byte)) {
    throw new Error('The packaged firmware failed its integrity check.')
  }
  return result
}
