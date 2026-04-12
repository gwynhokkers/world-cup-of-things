import type { H3Event } from 'h3'

type CloudflareEventContext = {
  cloudflare?: { waitUntil?: (promise: Promise<unknown>) => void }
}

/**
 * Run work after the HTTP response is sent on Cloudflare (waitUntil); otherwise fire-and-forget.
 * Errors are logged and never propagate to the caller.
 */
export function runAfterResponse(event: H3Event, work: () => Promise<void>): void {
  const promise = work().catch((err: unknown) => {
    console.error('[runAfterResponse]', err)
  })
  const waitUntil = (event.context as CloudflareEventContext).cloudflare?.waitUntil
  if (typeof waitUntil === 'function') {
    waitUntil(promise)
    return
  }
  void promise
}
