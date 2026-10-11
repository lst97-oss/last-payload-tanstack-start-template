import { TanStackRouterAdapter } from '@payloadcms/tanstack-start/client'
import { RootProvider } from '@payloadcms/ui'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import React from 'react'
import { type PayloadLayoutData, toRootProviderProps } from '@/lib/payload/layout'
import { payloadLayoutServerFn, payloadServerFn } from '@/lib/payload/server-fns'
import payloadAdminCss from '@/styles/payload-admin.css?url'

export const Route = createFileRoute('/_payload')({
  loader: async () => {
    const data = await payloadLayoutServerFn()
    return data as never
  },
  component: PayloadLayout,
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  }),
})

function PayloadLayout() {
  const data = Route.useLoaderData() as unknown as PayloadLayoutData
  const Provider = RootProvider as unknown as (props: Record<string, unknown>) => React.JSX.Element
  useAdminStyleCleanup()
  return (
    <>
      {/* Component-rendered so React 19 hoists it on mount (SSR + client
      nav) and removes it on unmount. The route `head()` link is NOT used:
      TanStack never removes route head links on leave, so the admin sheet
      kept styling the public site after back-navigation. */}
      <link rel="stylesheet" href={payloadAdminCss} precedence="default" />
      <Provider
        {...toRootProviderProps(data)}
        RouterAdapter={TanStackRouterAdapter}
        serverFunction={({ name, args }: { name: string; args: Record<string, unknown> }) =>
          payloadServerFn({ data: { args, name } })
        }
        highContrastMode={false}
      >
        <Outlet />
      </Provider>
    </>
  )
}

// The component-rendered admin sheet above self-removes on unmount (React 19
// hoisted resource). What remains: Vite's injected <style> tags for Payload
// package paths plus RSC-injected Payload <link> tags (data-rsc-css-href) —
// TanStack never removes those on leave. Drop them by identity. Sub-route
// switches inside /admin keep this layout mounted, so no flash there.
function useAdminStyleCleanup() {
  React.useEffect(() => {
    return () => {
      document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
        const href = el.getAttribute('href') ?? ''
        if (href.includes('@payloadcms')) el.remove()
      })
      document.querySelectorAll('style').forEach((el) => {
        const devId = el.getAttribute('data-vite-dev-id') ?? ''
        const text = el.textContent ?? ''
        if (devId.includes('@payloadcms') || text.startsWith('@layer payload-default, payload;')) el.remove()
      })
    }
  }, [])
}
