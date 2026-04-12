import { describe, it, expect } from 'vitest'
import {
  buildCurrentRoundVotesPayload,
  getCompletedUserIdsForRound
} from '../server/utils/currentRoundVotesPayload'

describe('currentRoundVotesPayload (API / current-round-votes)', () => {
  describe('getCompletedUserIdsForRound', () => {
    it('returns users who voted on every match in the round', () => {
      const ids = getCompletedUserIdsForRound(
        [
          { matchId: 1, userId: 'u1', entryId: 1 },
          { matchId: 2, userId: 'u1', entryId: 2 },
          { matchId: 1, userId: 'u2', entryId: 1 }
        ],
        2
      )
      expect(ids).toEqual(['u1'])
    })

    it('returns empty when no one completed all matches', () => {
      const ids = getCompletedUserIdsForRound(
        [{ matchId: 1, userId: 'u1', entryId: 1 }],
        2
      )
      expect(ids).toEqual([])
    })
  })

  describe('buildCurrentRoundVotesPayload', () => {
    it('builds voter rows from completed user ids and user rows', () => {
      const { voters, userVotes } = buildCurrentRoundVotesPayload(
        [
          { matchId: 10, userId: 'u1', entryId: 1 },
          { matchId: 11, userId: 'u1', entryId: 2 }
        ],
        [10, 11],
        ['u1'],
        [{ id: 'u1', name: 'Alice', image: 'x' }],
        'u1'
      )
      expect(voters).toEqual([{ userId: 'u1', name: 'Alice', image: 'x' }])
      expect(userVotes).toEqual([
        { matchId: 10, entryId: 1 },
        { matchId: 11, entryId: 2 }
      ])
    })

    it('returns empty userVotes when there is no session', () => {
      const { userVotes } = buildCurrentRoundVotesPayload(
        [{ matchId: 10, userId: 'u1', entryId: 1 }],
        [10],
        ['u1'],
        [{ id: 'u1', name: null, image: null }],
        null
      )
      expect(userVotes).toEqual([])
    })
  })
})
