import catalog from './module-documents.json' with { type: 'json' }
import { parseModuleDocument } from './module-contract.ts'
export const MODULE_DOCUMENTS = catalog.modules.map(parseModuleDocument)
export const MODULE_DOCUMENTS_BY_ID = Object.fromEntries(MODULE_DOCUMENTS.map(document=>[document.id,document]))
