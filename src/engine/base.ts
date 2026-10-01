// Fingerprints are metadata only. No firmware bytes are shipped with the app.
export const BASE_FIRMWARE = {
  version: '1.40C',
  filename: 'OCTATRACK_OS1.40C.bin',
  bytes: 469852,
  sha256: '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad',
} as const

export type FirmwareInspection = {
  name: string
  bytes: number
  sha256: string
  version: typeof BASE_FIRMWARE.version
}

export async function inspectBaseFirmware(
  buffer: ArrayBuffer,
  name: string,
): Promise<FirmwareInspection> {
  if (buffer.byteLength !== BASE_FIRMWARE.bytes) {
    throw new Error('Choose the original ' + BASE_FIRMWARE.filename + '. This file has a different size.')
  }
  if (!crypto.subtle) throw new Error('Firmware verification requires HTTPS. Use the hosted Octamod site or localhost on your computer; the Wi-Fi preview is for browsing.')
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  if (sha256 !== BASE_FIRMWARE.sha256) {
    throw new Error('This file does not match the original OS 1.40C. Choose an unmodified copy.')
  }
  return { name, bytes: buffer.byteLength, sha256, version: BASE_FIRMWARE.version }
}
