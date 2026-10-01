import { describe, expect, it } from 'vitest'
import { BASE_FIRMWARE, inspectBaseFirmware } from './base'
import { createEngineSession } from './session'
import type { EngineResponse } from './protocol'

describe('base firmware verification', () => {
  it('rejects a wrong-sized file before hashing', async () => {
    await expect(inspectBaseFirmware(new ArrayBuffer(1), BASE_FIRMWARE.filename)).rejects.toThrow('different size')
  })
  it('rejects incorrect bytes even when the name and size match', async () => {
    await expect(inspectBaseFirmware(new ArrayBuffer(BASE_FIRMWARE.bytes), BASE_FIRMWARE.filename)).rejects.toThrow('does not match')
  })
  it('refuses a build without verified firmware instead of producing a pretend file', async () => {
    const responses:EngineResponse[]=[]
    const handle=createEngineSession(response=>responses.push(response))
    await handle({id:1,type:'build',moduleIds:['repitch'],keepStockFx2:true})
    expect(responses).toEqual([{id:1,type:'error',message:'Choose and verify your base firmware first.'}])
  })
})
