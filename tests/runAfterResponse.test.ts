import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { runAfterResponse } from '../server/utils/runAfterResponse'

function createEvent(cloudflare?: { waitUntil?: (p: Promise<unknown>) => void }): H3Event {
  return { context: cloudflare ? { cloudflare } : {} } as H3Event
}

describe('runAfterResponse', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errSpy.mockRestore()
  })

  it('uses waitUntil when available and does not throw on work success', async () => {
    let captured: Promise<unknown> | undefined
    const waitUntil = vi.fn((p: Promise<unknown>) => {
      captured = p
    })
    const event = createEvent({ waitUntil })

    runAfterResponse(event, async () => {
      /* ok */
    })

    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(captured).toBeDefined()
    await expect(captured!).resolves.toBeUndefined()
  })

  it('logs when work rejects and waitUntil promise still settles', async () => {
    let captured: Promise<unknown> | undefined
    const waitUntil = vi.fn((p: Promise<unknown>) => {
      captured = p
    })
    const event = createEvent({ waitUntil })

    runAfterResponse(event, async () => {
      throw new Error('boom')
    })

    await expect(captured!).resolves.toBeUndefined()
    expect(errSpy).toHaveBeenCalledWith('[runAfterResponse]', expect.any(Error))
  })

  it('uses void promise when waitUntil is missing', async () => {
    const event = createEvent()
    runAfterResponse(event, async () => {
      /* ok */
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(errSpy).not.toHaveBeenCalled()
  })
})
