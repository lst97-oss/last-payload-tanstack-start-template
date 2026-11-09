import { describe, expect, test } from 'bun:test'

import { countFailures, destroyCachedPayloads, drainAll } from '@/payload/payload-shutdown'

// Exercises the shipped drain against a fake globalThis._payload cache.
// The Nitro `close` hook is wiring, covered by the live SIGTERM proof (shutdown.exit in the logs).
function setPayloadCache(entries: [string, unknown][] | undefined) {
  if (entries === undefined) {
    delete (globalThis as Record<string, unknown>)._payload
  } else {
    ;(globalThis as Record<string, unknown>)._payload = new Map(entries)
  }
}

describe('destroyCachedPayloads', () => {
  test('destroys every cached instance', async () => {
    const destroyed: string[] = []
    setPayloadCache([
      ['a', { destroy: async () => void destroyed.push('a') }],
      ['b', { destroy: async () => void destroyed.push('b') }],
    ])
    try {
      const results = await destroyCachedPayloads()
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true)
      expect(destroyed.sort()).toEqual(['a', 'b'])
    } finally {
      setPayloadCache(undefined)
    }
  })

  test('tolerates missing cache and failing destroy', async () => {
    setPayloadCache(undefined)
    expect(await destroyCachedPayloads()).toEqual([])

    setPayloadCache([
      ['broken', { destroy: async () => Promise.reject(new Error('pool gone')) }],
      ['fine', { destroy: async () => {} }],
    ])
    try {
      const results = await destroyCachedPayloads()
      expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
    } finally {
      setPayloadCache(undefined)
    }
  })
})

describe('drainAll', () => {
  test('drains payload cache and business pool together', async () => {
    setPayloadCache(undefined)
    const results = await drainAll()
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true)
  })
})

describe('countFailures', () => {
  test('counts rejections at the top level and inside the payload result list', () => {
    const payloads = [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('x') },
    ]
    const results = [
      { status: 'fulfilled', value: payloads },
      { status: 'rejected', reason: new Error('business') },
    ] as PromiseSettledResult<unknown>[]
    expect(countFailures(results)).toBe(2)
    expect(countFailures([{ status: 'fulfilled', value: undefined }])).toBe(0)
  })
})
