import { importMap } from '@/payload-import-map'

// Payload does not expose the generated import map on the Payload instance,
// so this keeps the generated-module boundary in one place.
export function getPayloadImportMap() {
  return importMap
}
