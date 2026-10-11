import { NotFoundClient } from '@payloadcms/ui'

import { adminNotFoundElement } from '@/lib/payload/admin-not-found-element'

// Payload's own admin not-found view: `loadAdminPage` already builds the
// not-found RSC payload and the loader forwards it as `result.element`.
// Falls back to bare `NotFoundClient` when absent (same shape as upstream
// `AdminNotFound`). Both admin routes share this boundary so index ↔ splat
// navigation preserves the admin subtree.
//
// The throw must stay a throw: returning the payload would answer HTTP 200,
// and the route component never renders once a match is marked not-found.
export function AdminNotFound({ data }: { data?: unknown }) {
  const element = adminNotFoundElement(data)
  // Compare against `undefined`, not truthiness: `0` and `''` are legal React
  // children, and a truthiness check would discard them for the fallback.
  if (element === undefined) return <NotFoundClient />

  return <>{element}</>
}
