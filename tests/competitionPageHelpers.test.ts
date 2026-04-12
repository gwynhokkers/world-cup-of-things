import { describe, it, expect } from 'vitest'
import {
  everyMatchHasAtLeastOneVote,
  mergeOptimisticUserVotes,
  roundVotersWithOptionalCurrentUser
} from '../app/utils/competitionPageHelpers'

describe('competitionPageHelpers (comp/[slug] voting UI)', () => {
  describe('mergeOptimisticUserVotes', () => {
    it('merges API votes with optimistic picks', () => {
      const map = mergeOptimisticUserVotes(
        [{ matchId: 1, entryId: 10 }],
        new Map([[2, 20]])
      )
      expect(map.get(1)).toBe(10)
      expect(map.get(2)).toBe(20)
    })

    it('lets optimistic override API for the same match', () => {
      const map = mergeOptimisticUserVotes(
        [{ matchId: 1, entryId: 10 }],
        new Map([[1, 99]])
      )
      expect(map.get(1)).toBe(99)
    })
  })

  describe('roundVotersWithOptionalCurrentUser', () => {
    it('appends current user when they completed all matches but API list lacks them', () => {
      const voters = roundVotersWithOptionalCurrentUser(
        [{ userId: 'a', name: 'A', image: null }],
        [{ id: 1 }, { id: 2 }],
        new Map([
          [1, 1],
          [2, 2]
        ]),
        { id: 'me', name: 'Me', image: null }
      )
      expect(voters).toHaveLength(2)
      expect(voters[1]).toEqual({
        userId: 'me',
        name: 'Me',
        image: null
      })
    })

    it('does not duplicate when API already includes current user', () => {
      const voters = roundVotersWithOptionalCurrentUser(
        [{ userId: 'me', name: 'Me', image: null }],
        [{ id: 1 }],
        new Map([[1, 1]]),
        { id: 'me', name: 'Me', image: null }
      )
      expect(voters).toHaveLength(1)
    })

    it('returns API only when not signed in', () => {
      const api = [{ userId: 'a', name: 'A', image: null }]
      expect(roundVotersWithOptionalCurrentUser(api, [{ id: 1 }], new Map([[1, 1]]), null)).toBe(api)
    })
  })

  describe('everyMatchHasAtLeastOneVote', () => {
    it('is false when any match has zero votes recorded', () => {
      expect(
        everyMatchHasAtLeastOneVote([1, 2], { 1: 1, 2: 0 })
      ).toBe(false)
    })

    it('is true when every match has at least one vote', () => {
      expect(
        everyMatchHasAtLeastOneVote([1, 2], { 1: 2, 2: 1 })
      ).toBe(true)
    })

    it('is false when counts missing', () => {
      expect(everyMatchHasAtLeastOneVote([1], undefined)).toBe(false)
    })
  })
})
