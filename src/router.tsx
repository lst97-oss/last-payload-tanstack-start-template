import { payloadParseSearch, payloadStringifySearch } from '@payloadcms/tanstack-start/shared'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from '@/integrations/tanstack-query/root-provider'
import { SiteNotFound } from '@/lib/site-not-found'
import { routeTree } from '@/routeTree.gen'

export function getRouter() {
  const context = getContext()
  const router = createTanStackRouter({
    routeTree,
    context,
    defaultNotFoundComponent: SiteNotFound,
    parseSearch: payloadParseSearch,
    stringifySearch: payloadStringifySearch,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
