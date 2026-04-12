import type { Match } from '~/stores/competition'
import type { RoundVoter } from '~/components/competition/RoundVotersAvatars.vue'

/** Merge API user votes with optimistic updates from this session. */
export function mergeOptimisticUserVotes(
  apiUserVotes: Array<{ matchId: number; entryId: number }>,
  optimistic: Map<number, number>
): Map<number, number> {
  const map = new Map(apiUserVotes.map((v) => [v.matchId, v.entryId]))
  for (const [matchId, entryId] of optimistic) map.set(matchId, entryId)
  return map
}

/**
 * When the signed-in user has voted in every match of the round but the API list
 * has not yet included them (timing), append them for the avatar strip.
 */
export function roundVotersWithOptionalCurrentUser(
  apiVoters: RoundVoter[],
  matches: Pick<Match, 'id'>[],
  mergedVotes: Map<number, number>,
  currentUser: { id: string; name: string | null; image: string | null } | null
): RoundVoter[] {
  const userCompleted =
    currentUser &&
    matches.length > 0 &&
    matches.every((m) => mergedVotes.has(m.id)) &&
    !apiVoters.some((v) => v.userId === currentUser.id)
  if (userCompleted) {
    return [
      ...apiVoters,
      {
        userId: currentUser.id,
        name: currentUser.name ?? null,
        image: currentUser.image ?? null
      }
    ]
  }
  return apiVoters
}

/** Owner can close the round when every current-round match has at least one vote (any voter). */
export function everyMatchHasAtLeastOneVote(
  matchIds: number[],
  voteCountByMatchId: Record<number, number> | undefined
): boolean {
  if (!matchIds.length) return false
  if (!voteCountByMatchId) return false
  return matchIds.every((id) => (voteCountByMatchId[id] ?? 0) >= 1)
}
