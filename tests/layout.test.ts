import { describe, expect, test } from 'bun:test'

import { toRootProviderProps } from '@/lib/payload/layout'

describe('toRootProviderProps', () => {
  test('renames clientConfig to config and drops children', () => {
    const clientConfig = { collections: ['users'] }
    expect(toRootProviderProps({ children: 'tree', clientConfig, theme: 'dark' })).toEqual({
      config: clientConfig,
      theme: 'dark',
    })
  })

  test('absent clientConfig becomes undefined config', () => {
    expect(toRootProviderProps({ locale: 'en' })).toEqual({ config: undefined, locale: 'en' })
  })
})
