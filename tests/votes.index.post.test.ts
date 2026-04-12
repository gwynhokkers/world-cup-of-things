import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { readBody as h3ReadBody } from 'h3'
import postVote from '../server/api/votes/index.post'

const handler = postVote as (event: H3Event) => Promise<unknown>

const matchRow = {
  id: 50,
  competitionId: 99,
  round: 1,
  matchIndex: 0,
  entryAId: 10,
  entryBId: 20,
  winnerId: null as number | null
}

const competitionRow = {
  id: 99,
  ownerId: 'owner',
  title: 'C',
  slug: 'c',
  status: 'open' as const,
  currentRound: 1
}

const { insertReturning, updateReturning, getVotesSelectRows } = vi.hoisted(() => {
  const rows = { current: [] as unknown[] }
  return {
    insertReturning: vi.fn(),
    updateReturning: vi.fn(),
    getVotesSelectRows: rows
  }
})

let selectCall = 0

vi.mock('~/utils/abilities', () => ({
  voteOnCompetition: {}
}))

vi.mock('~~/server/utils/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ id: 'voter-1' })
}))

vi.mock('@nuxthub/db', () => ({
  db: {
    select: vi.fn(() => {
      selectCall++
      if (selectCall === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([matchRow]))
          }))
        }
      }
      if (selectCall === 2) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([competitionRow]))
          }))
        }
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(getVotesSelectRows.current))
        }))
      }
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => insertReturning())
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => updateReturning())
        }))
      }))
    }))
  },
  schema: {
    matches: {},
    competitions: {},
    votes: {}
  }
}))

describe('POST /api/votes (competition voting)', () => {
  const event = {} as H3Event

  afterEach(() => {
    globalThis.readBody = h3ReadBody
  })

  beforeEach(() => {
    selectCall = 0
    getVotesSelectRows.current = []
    insertReturning.mockReset()
    updateReturning.mockReset()
    insertReturning.mockResolvedValue([
      { id: 1, matchId: 50, userId: 'voter-1', entryId: 10 }
    ])
    updateReturning.mockResolvedValue([
      { id: 2, matchId: 50, userId: 'voter-1', entryId: 20 }
    ])
  })

  it('returns 400 when matchId or entryId is missing', async () => {
    globalThis.readBody = vi.fn().mockResolvedValue({ matchId: 50 }) as typeof h3ReadBody
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('inserts a new vote for a valid match and entry', async () => {
    globalThis.readBody = vi.fn().mockResolvedValue({ matchId: 50, entryId: 10 }) as typeof h3ReadBody
    const vote = await handler(event)
    expect(vote).toMatchObject({
      matchId: 50,
      userId: 'voter-1',
      entryId: 10
    })
    expect(insertReturning).toHaveBeenCalledTimes(1)
  })

  it('updates vote when user picks the other entry in the same match', async () => {
    getVotesSelectRows.current = [
      { id: 9, matchId: 50, userId: 'voter-1', entryId: 10 }
    ]
    globalThis.readBody = vi.fn().mockResolvedValue({ matchId: 50, entryId: 20 }) as typeof h3ReadBody
    const vote = await handler(event)
    expect(vote).toMatchObject({ entryId: 20 })
    expect(updateReturning).toHaveBeenCalledTimes(1)
    expect(insertReturning).not.toHaveBeenCalled()
  })

  it('returns 400 when entry is not part of the match', async () => {
    globalThis.readBody = vi.fn().mockResolvedValue({ matchId: 50, entryId: 999 }) as typeof h3ReadBody
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid entry for this match'
    })
  })
})
