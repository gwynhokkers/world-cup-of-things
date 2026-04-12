import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { readBody as h3ReadBody } from 'h3'
import postCompetition from '../server/api/competitions/index.post'

const selectWhere = vi.fn()

vi.mock('~/utils/abilities', () => ({
  createCompetition: {}
}))

vi.mock('~~/server/utils/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ id: 'owner-1' })
}))

vi.mock('~~/server/utils/slug', () => ({
  generateSlug: vi.fn()
}))

vi.mock('@nuxthub/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => selectWhere())
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => ({
        returning: vi.fn(() =>
          Promise.resolve([{ id: 42, ...vals }])
        )
      }))
    }))
  },
  schema: {
    competitions: {}
  }
}))

import { generateSlug } from '~~/server/utils/slug'

const handler = postCompetition as (event: H3Event) => Promise<unknown>

describe('POST /api/competitions (create competition)', () => {
  const event = {} as H3Event

  afterEach(() => {
    globalThis.readBody = h3ReadBody
  })

  beforeEach(() => {
    selectWhere.mockReset()
    vi.mocked(generateSlug).mockReset()
    vi.mocked(generateSlug).mockReturnValue('generated-slug')
    selectWhere.mockResolvedValue([])
  })

  it('returns 400 when title is missing or whitespace', async () => {
    globalThis.readBody = vi.fn().mockResolvedValue({ title: '   ' }) as typeof h3ReadBody
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Title is required'
    })
  })

  it('creates a draft competition with trimmed title', async () => {
    globalThis.readBody = vi.fn().mockResolvedValue({ title: '  Best tea  ' }) as typeof h3ReadBody
    const row = await handler(event)
    expect(row).toMatchObject({
      ownerId: 'owner-1',
      title: 'Best tea',
      slug: 'generated-slug',
      status: 'draft',
      currentRound: 1
    })
  })

  it('retries slug when the first generated slug already exists', async () => {
    globalThis.readBody = vi.fn().mockResolvedValue({ title: 'T' }) as typeof h3ReadBody
    vi.mocked(generateSlug).mockReturnValueOnce('taken').mockReturnValueOnce('free')
    selectWhere.mockResolvedValueOnce([{ slug: 'taken' }]).mockResolvedValueOnce([])

    const row = await handler(event)
    expect(vi.mocked(generateSlug)).toHaveBeenCalledTimes(2)
    expect(row).toMatchObject({ slug: 'free' })
  })
})
