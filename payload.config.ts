import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { migrations } from '@/migrations'
import { getServerEnv } from '@/server/env'
import { resolvePayloadServerUrl } from '@/server/security/payload-server-url'

const env = getServerEnv()
// import.meta.dir is Bun-only; the Payload CLI (generate:types,
// migrate:create) runs under Node, so fall back to import.meta.dirname.
const projectDirectory = import.meta.dir ?? import.meta.dirname
const projectPath = (relativePath: string) => `${projectDirectory}/${relativePath.replace(/^\.\//, '')}`

export default buildConfig({
  graphQL: {
    disable: true,
  },
  llmInstructions: false,
  maxDepth: 5,
  serverURL: resolvePayloadServerUrl(env),
  admin: {
    user: 'users',
    importMap: {
      importMapFile: projectPath('./src/payload-import-map.ts'),
    },
  },
  collections: [
    {
      slug: 'users',
      authorship: false,
      auth: true,
      admin: {
        useAsTitle: 'email',
      },
      fields: [],
    },
  ],
  db: postgresAdapter({
    push: false,
    prodMigrations: migrations,
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  editor: lexicalEditor({}),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: projectPath('./payload-types.ts'),
  },
  jobs: {
    tasks: [],
  },
})
