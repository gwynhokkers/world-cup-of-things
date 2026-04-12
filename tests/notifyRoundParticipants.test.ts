import { describe, it, expect, vi, beforeEach } from 'vitest'

const { batchSend } = vi.hoisted(() => ({
  batchSend: vi.fn()
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    batch = { send: batchSend }
  }
}))

const mockSelect = vi.fn()

vi.mock('@nuxthub/db', () => ({
  db: { select: (...args: unknown[]) => mockSelect(...args) },
  schema: {
    votes: { userId: 'votes.userId', matchId: 'votes.matchId' },
    matches: { id: 'matches.id', competitionId: 'matches.competitionId', round: 'matches.round' },
    users: { id: 'users.id', email: 'users.email', name: 'users.name' }
  }
}))

import { notifyRoundParticipantsAfterRoundClose } from '../server/utils/notifyRoundParticipants'

const baseConfig = {
  resendApiKey: 're_test',
  resendFrom: 'App <notify@example.com>',
  public: { siteUrl: '' }
}

function voteChain(rows: { userId: number }[]) {
  return {
    from: () => ({
      innerJoin: () => ({
        where: async () => rows
      })
    })
  }
}

function usersChain(rows: { id: number; email: string; name: string | null }[]) {
  return {
    from: () => ({
      where: async () => rows
    })
  }
}

describe('notifyRoundParticipantsAfterRoundClose', () => {
  beforeEach(() => {
    batchSend.mockReset()
    batchSend.mockResolvedValue({ error: null })
    mockSelect.mockReset()
  })

  it('does not call Resend when API key is missing', async () => {
    await notifyRoundParticipantsAfterRoundClose(
      { ...baseConfig, resendApiKey: '' },
      'https://site.com',
      {
        competitionId: 1,
        slug: 'c',
        title: 'T',
        closedRound: 1,
        outcome: { kind: 'completed' }
      }
    )
    expect(batchSend).not.toHaveBeenCalled()
  })

  it('does not call Resend when from address is missing', async () => {
    await notifyRoundParticipantsAfterRoundClose(
      { ...baseConfig, resendFrom: '' },
      'https://site.com',
      {
        competitionId: 1,
        slug: 'c',
        title: 'T',
        closedRound: 1,
        outcome: { kind: 'completed' }
      }
    )
    expect(batchSend).not.toHaveBeenCalled()
  })

  it('does not call Resend when base URL is empty', async () => {
    await notifyRoundParticipantsAfterRoundClose(baseConfig, '', {
      competitionId: 1,
      slug: 'c',
      title: 'T',
      closedRound: 1,
      outcome: { kind: 'completed' }
    })
    expect(batchSend).not.toHaveBeenCalled()
  })

  it('returns early when there are no votes in the round', async () => {
    mockSelect.mockImplementationOnce(() => voteChain([]))
    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://site.com', {
      competitionId: 1,
      slug: 'c',
      title: 'T',
      closedRound: 1,
      outcome: { kind: 'completed' }
    })
    expect(batchSend).not.toHaveBeenCalled()
  })

  it('returns early when no eligible users have email addresses', async () => {
    mockSelect.mockImplementationOnce(() => voteChain([{ userId: 1 }]))
    mockSelect.mockImplementationOnce(() =>
      usersChain([{ id: 1, email: '  ', name: null }])
    )
    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://site.com', {
      competitionId: 1,
      slug: 'c',
      title: 'T',
      closedRound: 1,
      outcome: { kind: 'completed' }
    })
    expect(batchSend).not.toHaveBeenCalled()
  })

  it('sends batch email for next round outcome with correct link and idempotency key', async () => {
    mockSelect.mockImplementationOnce(() => voteChain([{ userId: 1 }]))
    mockSelect.mockImplementationOnce(() =>
      usersChain([{ id: 1, email: 'voter@example.com', name: 'Alice' }])
    )

    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://site.com/', {
      competitionId: 42,
      slug: 'my-comp',
      title: 'Best <Things>',
      closedRound: 1,
      outcome: { kind: 'nextRound', nextRound: 2 }
    })

    expect(batchSend).toHaveBeenCalledTimes(1)
    const [payload, options] = batchSend.mock.calls[0]!
    expect(options).toEqual({ idempotencyKey: 'round-close-42-1-batch-0' })
    expect(payload).toHaveLength(1)
    expect(payload[0]).toMatchObject({
      from: baseConfig.resendFrom,
      to: ['voter@example.com'],
      subject: 'New round in "Best <Things>"'
    })
    expect(payload[0].html).toContain('Hi Alice')
    expect(payload[0].html).toContain('Best &lt;Things&gt;')
    expect(payload[0].html).toContain('Round 2</strong> is now open')
    expect(payload[0].html).toContain('href="https://site.com/comp/my-comp"')
  })

  it('sends batch email for completed competition outcome', async () => {
    mockSelect.mockImplementationOnce(() => voteChain([{ userId: 1 }]))
    mockSelect.mockImplementationOnce(() =>
      usersChain([{ id: 1, email: 'voter@example.com', name: null }])
    )

    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://site.com', {
      competitionId: 1,
      slug: 'c',
      title: 'Done',
      closedRound: 3,
      outcome: { kind: 'completed' }
    })

    const [payload] = batchSend.mock.calls[0]!
    expect(payload[0].subject).toBe('"Done" is complete — see the results')
    expect(payload[0].html).toContain('Hi there')
    expect(payload[0].html).toContain('final round')
  })

  it('encodes slug in competition URL', async () => {
    mockSelect.mockImplementationOnce(() => voteChain([{ userId: 1 }]))
    mockSelect.mockImplementationOnce(() =>
      usersChain([{ id: 1, email: 'v@e.com', name: 'x' }])
    )

    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://x.test', {
      competitionId: 1,
      slug: 'a/b',
      title: 'T',
      closedRound: 1,
      outcome: { kind: 'completed' }
    })

    const [payload] = batchSend.mock.calls[0]!
    expect(payload[0].html).toContain('href="https://x.test/comp/a%2Fb"')
  })

  it('chunks more than 100 recipients into multiple batches with distinct idempotency keys', async () => {
    const voteRows = Array.from({ length: 101 }, (_, i) => ({ userId: i + 1 }))
    const userRows = Array.from({ length: 101 }, (_, i) => ({
      id: i + 1,
      email: `u${i + 1}@e.com`,
      name: null as string | null
    }))

    mockSelect.mockImplementationOnce(() => voteChain(voteRows))
    mockSelect.mockImplementationOnce(() => usersChain(userRows))

    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://site.com', {
      competitionId: 7,
      slug: 'c',
      title: 'T',
      closedRound: 2,
      outcome: { kind: 'completed' }
    })

    expect(batchSend).toHaveBeenCalledTimes(2)
    expect(batchSend.mock.calls[0]![1]).toEqual({ idempotencyKey: 'round-close-7-2-batch-0' })
    expect(batchSend.mock.calls[0]![0]).toHaveLength(100)
    expect(batchSend.mock.calls[1]![1]).toEqual({ idempotencyKey: 'round-close-7-2-batch-1' })
    expect(batchSend.mock.calls[1]![0]).toHaveLength(1)
  })

  it('logs when Resend returns an error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    batchSend.mockResolvedValue({ error: { message: 'rate_limited' } })

    mockSelect.mockImplementationOnce(() => voteChain([{ userId: 1 }]))
    mockSelect.mockImplementationOnce(() =>
      usersChain([{ id: 1, email: 'v@e.com', name: 'x' }])
    )

    await notifyRoundParticipantsAfterRoundClose(baseConfig, 'https://site.com', {
      competitionId: 1,
      slug: 'c',
      title: 'T',
      closedRound: 1,
      outcome: { kind: 'completed' }
    })

    expect(errSpy).toHaveBeenCalledWith(
      '[notifyRoundParticipants] Resend batch error:',
      'rate_limited',
      expect.objectContaining({ message: 'rate_limited' })
    )
    errSpy.mockRestore()
  })
})
