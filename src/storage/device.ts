import type { Configuration } from '../config/workspace'
import { validateConfiguration } from '../config/workspace'

export type StoredFirmware = { name: string; blob: Blob }
const DATABASE = 'octamod-device'
export async function openDeviceDatabase(name = DATABASE): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('configurations', { keyPath: 'id' })
      request.result.createObjectStore('settings')
      request.result.createObjectStore('firmware')
    }
    request.onerror = () => reject(request.error ?? new Error('Browser storage is unavailable.'))
    request.onblocked = () => reject(new Error('Close other Octamod tabs and reload to open browser storage.'))
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
  })
}
export function deviceStore(db: IDBDatabase) {
  function transaction<T>(store: string, mode: IDBTransactionMode, operation: (table: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode)
      const request = operation(tx.objectStore(store))
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = tx.onerror = () => reject(tx.error ?? request.error ?? new Error('Could not save on this device.'))
    })
  }
  return {
    async listConfigurations() {
      const items = await transaction('configurations', 'readonly', store => store.getAll())
      return items.map(validateConfiguration).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
    async saveConfiguration(item: Configuration) {
      await transaction('configurations', 'readwrite', store => store.put(validateConfiguration(item)))
    },
    async deleteConfiguration(id: string) { await transaction('configurations', 'readwrite', store => store.delete(id)) },
    async activeConfiguration(): Promise<string | undefined> { return transaction('settings', 'readonly', store => store.get('active')) },
    async setActiveConfiguration(id: string) { await transaction('settings', 'readwrite', store => store.put(id, 'active')) },
    async readFirmware(): Promise<StoredFirmware | undefined> { return transaction('firmware', 'readonly', store => store.get('base')) },
    async saveFirmware(file: File) {
      await transaction('firmware', 'readwrite', store => store.put({ name: file.name, blob: file }, 'base'))
    },
    async forgetFirmware() { await transaction('firmware', 'readwrite', store => store.delete('base')) },
  }
}
export type DeviceStore = ReturnType<typeof deviceStore>
