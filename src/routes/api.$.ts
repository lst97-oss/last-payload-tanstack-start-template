import { payloadApiHandlers } from '@payloadcms/tanstack-start/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/$')({
  server: {
    // The adapter strips query parameters before matching REST endpoint paths.
    handlers: payloadApiHandlers({ getConfig: async () => (await import('@payload-config')).default }),
  },
})
