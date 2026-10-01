import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { deviceStore, openDeviceDatabase } from './device'
import { newConfiguration, validateConfiguration } from '../config/workspace'

describe('device persistence', () => {
  it('keeps independently edited configurations and the active selection across connections', async () => {
    const name = 'test-' + crypto.randomUUID()
    const db = await openDeviceDatabase(name)
    const store = deviceStore(db)
    const a = newConfiguration('Live set', ['tapeecho'])
    const b = {...newConfiguration('Ambient', ['miniverb', 'repitch']),createdAt:new Date(Date.parse(a.createdAt)+1).toISOString()}
    await store.saveConfiguration(a); await store.saveConfiguration(b)
    await store.saveConfiguration({ ...a, name: 'Live set II', moduleIds: ['euclid'],moduleVersions:{euclid:'0.1.0-experimental'} })
    await store.setActiveConfiguration(b.id)
    db.close()
    const restoredDb = await openDeviceDatabase(name)
    const restored = deviceStore(restoredDb)
    expect((await restored.listConfigurations()).map(item => [item.name, item.moduleIds])).toEqual([['Live set II', ['euclid']], ['Ambient', ['miniverb', 'repitch']]])
    expect(await restored.activeConfiguration()).toBe(b.id)
    await restored.deleteConfiguration(a.id)
    expect((await restored.listConfigurations()).map(item => item.id)).toEqual([b.id])
    restoredDb.close()
  })
  it('stores a binary locally and removes it permanently without touching configurations', async () => {
    const db = await openDeviceDatabase('test-' + crypto.randomUUID())
    const store = deviceStore(db)
    const config = newConfiguration('Test')
    await store.saveConfiguration(config)
    // Synthetic bytes only: no real firmware in tests.
    await store.saveFirmware(new File([new Uint8Array([1, 2, 3])], 'synthetic.bin'))
    expect(Array.from(new Uint8Array(await (await store.readFirmware())!.blob.arrayBuffer()))).toEqual([1, 2, 3])
    await store.forgetFirmware()
    expect(await store.readFirmware()).toBeUndefined()
    expect(await store.listConfigurations()).toHaveLength(1)
    db.close()
  })
  it('refuses blank names and unknown module identities before saving', async () => {
    expect(() => newConfiguration('   ')).toThrow()
    expect(() => newConfiguration('Unknown', ['not-a-module'])).toThrow()
  })
})

it('migrates old device configurations without changing selection and preserves explicit compact menus',async()=>{
 const created=newConfiguration('Legacy',['euclid']),{keepStockFx2,...legacy}=created
 expect(keepStockFx2).toBe(true);expect(validateConfiguration(legacy).keepStockFx2).toBe(true)
 const db=await openDeviceDatabase('test-'+crypto.randomUUID()),store=deviceStore(db)
 await store.saveConfiguration({...created,keepStockFx2:false})
 expect((await store.listConfigurations())[0].keepStockFx2).toBe(false);db.close()
})
