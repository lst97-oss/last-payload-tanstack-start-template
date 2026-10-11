// @ts-nocheck — vendored Payload TanStack workaround plugins (see vendor/payload-tanstack-vite/README.md).

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { reactStartRscVitePlugin } from '@tanstack/react-start-rsc/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteRsc from '@vitejs/plugin-rsc'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { clientModuleResolution } from '#vendor/payload-tanstack-vite/clientModuleResolution.js'
import {
  optimizeDepsExcludeDefaults,
  optimizeDepsIncludeDefaults,
  payloadNoExternalPatterns,
  ssrExternalPackages,
} from '#vendor/payload-tanstack-vite/constants.js'
import { payloadDevTransforms } from '#vendor/payload-tanstack-vite/devTransforms.js'
import {
  defaultImportProtectionIgnoreImporters,
  onImportProtectionViolation,
  serverOnlyClientSpecifiers,
} from '#vendor/payload-tanstack-vite/importProtection.js'
import { reactDomServerInRsc } from '#vendor/payload-tanstack-vite/reactDomServerInRsc.js'
import { ssrStripDistStyleImports } from '#vendor/payload-tanstack-vite/stripDistStyleImports.js'
import { wrapCjsForClient } from '#vendor/payload-tanstack-vite/wrapCjsForClient.js'

// Vite bundles this config to node_modules/.vite-temp and imports the bundle,
// so import.meta.dir/dirname point at the temp dir — not the project root.
// Resolve aliases from the dev server working directory (project root) instead.
const projectDirectory = Bun.cwd
const projectPath = (relativePath: string) => `${projectDirectory}/${relativePath.replace(/^\.\//, '')}`

const PRIVATE_NO_STORE = { 'cache-control': 'private, no-store' }

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@payload-config',
        replacement: projectPath('./payload.config.ts'),
      },
      {
        find: '@payloadcms/ui/scss/app.scss',
        replacement: projectPath('./node_modules/@payloadcms/ui/dist/css/app.css'),
      },
      {
        find: 'react/compiler-runtime',
        replacement: projectPath('./vendor/react-compiler-runtime.ts'),
      },
      {
        find: 'sanitize-filename',
        replacement: projectPath('./vendor/sanitize-filename.ts'),
      },
    ],
    dedupe: ['react', 'react-dom', 'scheduler', '@payloadcms/ui'],
    tsconfigPaths: true,
  },
  environments: {
    ssr: {
      resolve: {
        noExternal: payloadNoExternalPatterns,
      },
    },
  },
  optimizeDeps: {
    exclude: [...optimizeDepsExcludeDefaults],
    include: [...optimizeDepsIncludeDefaults],
  },
  ssr: {
    external: [...ssrExternalPackages],
    noExternal: payloadNoExternalPatterns,
  },
  plugins: [
    clientModuleResolution(),
    wrapCjsForClient(),
    ssrStripDistStyleImports(),
    reactDomServerInRsc(),
    payloadDevTransforms(),
    // serverHandler:false — Start owns dev server entry; default 500s otherwise
    viteRsc({ serverHandler: false }),
    reactStartRscVitePlugin(),
    tanstackStart({
      rsc: { enabled: true },
      importProtection: {
        client: {
          excludeFiles: [],
          specifiers: serverOnlyClientSpecifiers,
        },
        ignoreImporters: [...defaultImportProtectionIgnoreImporters],
        include: ['**/*'],
        mockAccess: 'warn',
        onViolation: onImportProtectionViolation,
        server: { files: [] },
      },
    }),
    viteReact(),
    nitro({
      plugins: ['./src/plugins/payload-shutdown.ts'],
      preset: Bun.env.NITRO_PRESET ?? 'vercel',
      routeRules: {
        '/admin/**': { headers: PRIVATE_NO_STORE },
        '/_payload/**': { headers: PRIVATE_NO_STORE },
        '/api/**': { headers: PRIVATE_NO_STORE },
      },
    }),
  ],
})
