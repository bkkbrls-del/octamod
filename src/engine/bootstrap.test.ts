import { describe, expect, it } from 'vitest'
import { BOOTSTRAP_ADDRESS, createRuntimeBootstrap, PLATFORM_RESERVE_BYTES, runtimeStageLayout } from './bootstrap'
import fixtures from './assets/bootstrap-oracles.json'
import packing from './assets/runtime-packing-oracles.json'
const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g)!, byte => parseInt(byte, 16))
async function hash(bytes: Uint8Array) { const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer); return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
describe('native runtime bootstrap parity', () => {
  for (const fixture of fixtures.cases) it(`matches the native loader append: ${packing.cases[fixture.case].name}`, async () => {
    const raw = fromHex(packing.cases[fixture.case].inputHex), result = await createRuntimeBootstrap(raw)
    expect(result.append.length).toBe(fixture.expected.bytes)
    expect(await hash(result.append)).toBe(fixture.expected.sha256)
    expect(result.layout.stage).toBe(fixture.expected.stage)
    expect(result.layout.stageEnd).toBe(fixture.expected.stageEnd)
    expect(result.rawHash).toBe(fixture.expected.rawHash)
    expect(result.packedHash).toBe(fixture.expected.packedHash)
    const table = new DataView(result.append.buffer)
    expect(table.getUint32(196)).toBe(1)
    expect(table.getUint32(200)).toBe(BOOTSTRAP_ADDRESS + 232)
  })
  it('rejects invalid extents and overlapping or oversized runtime stages', async () => {
    await expect(createRuntimeBootstrap(new Uint8Array())).rejects.toThrow('reserved sample memory')
    for (const size of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) expect(() => runtimeStageLayout(size, 13)).toThrow()
    for (const size of [0, -1, 12, 13.5, NaN, Number.MAX_SAFE_INTEGER]) expect(() => runtimeStageLayout(1, size)).toThrow()
    expect(() => runtimeStageLayout(PLATFORM_RESERVE_BYTES, 13)).toThrow('reserved sample memory')
    expect(() => runtimeStageLayout(1, PLATFORM_RESERVE_BYTES)).toThrow('reserved sample memory')
  })
})
