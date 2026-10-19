// @ts-nocheck — vendored Payload TanStack workaround plugins (see vendor/payload-tanstack-vite/README.md).

import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { reactStartRscVitePlugin } from '@tanstack/react-start-rsc/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteRsc from '@vitejs/plugin-rsc'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { clientModuleResolution } from '#vendor/payload-tanstack-vite/clientModuleResolution.js'
import { payloadDevTransforms } from '#vendor/payload-tanstack-vite/devTransforms.js'
import { payloadNoExternalPatterns, ssrExternalPackages } from '#vendor/payload-tanstack-vite/external.js'
import {
  defaultImportProtectionIgnoreImporters,
  onImportProtectionViolation,
  serverOnlyClientSpecifiers,
} from '#vendor/payload-tanstack-vite/importProtection.js'
import { optimizeDepsExcludeDefaults, optimizeDepsIncludeDefaults } from '#vendor/payload-tanstack-vite/optimizeDeps.js'
import { reactDomServerInRsc } from '#vendor/payload-tanstack-vite/reactDomServerInRsc.js'
import { ssrStripDistStyleImports } from '#vendor/payload-tanstack-vite/stripDistStyleImports.js'
import { wrapCjsForClient } from '#vendor/payload-tanstack-vite/wrapCjsForClient.js'

// Vite bundles this config to node_modules/.vite-temp and imports the bundle,
// so import.meta.dir/dirname point at the temp dir — not the project root.
// Resolve aliases from the dev server working directory (project root) instead.
const projectDirectory = Bun.cwd
const projectPath = (relativePath: string) => `${projectDirectory}/${relativePath.replace(/^\.\//, '')}`

const PRIVATE_NO_STORE = { 'cache-control': 'private, no-store' }

// Minimal hardening headers for admin + API surfaces. No CSP: Payload admin
// ships inline scripts that a static policy would break. HSTS only in
// production — dev runs over plain http://localhost.
const PRIVATE_SECURITY_HEADERS =
  Bun.env.NODE_ENV === 'production'
    ? {
        'referrer-policy': 'same-origin',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-content-type-options': 'nosniff',
      }
    : {
        'referrer-policy': 'same-origin',
        'x-content-type-options': 'nosniff',
      }

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
    tailwindcss(),
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
    // React Compiler (OXC, client-only): annotation mode compiles only 'use memo' files.
    viteReact({ compiler: { target: '19', compilationMode: 'annotation' } }),
    nitro({
      plugins: ['./src/plugins/payload-shutdown.ts'],
      preset: Bun.env.NITRO_PRESET ?? 'vercel',
      routeRules: {
        '/admin/**': { headers: { ...PRIVATE_NO_STORE, ...PRIVATE_SECURITY_HEADERS } },
        '/_payload/**': { headers: { ...PRIVATE_NO_STORE, ...PRIVATE_SECURITY_HEADERS } },
        '/api/**': { headers: { ...PRIVATE_NO_STORE, ...PRIVATE_SECURITY_HEADERS } },
      },
    }),
  ],
})
