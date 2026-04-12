export type CurrentRoundVoteRow = {
  matchId: number
  userId: string
  entryId: number
}

export type CurrentRoundVoter = {
  userId: string
  name: string | null
  image: string | null
}

/** Users who have cast a vote on every match in the round. */
export function getCompletedUserIdsForRound(
  voteRows: CurrentRoundVoteRow[],
  roundMatchCount: number
): string[] {
  const votesByUser = new Map<string, Set<number>>()
  for (const v of voteRows) {
    if (!votesByUser.has(v.userId)) votesByUser.set(v.userId, new Set())
    votesByUser.get(v.userId)!.add(v.matchId)
  }
  return [...votesByUser.entries()]
    .filter(([, matchIds]) => matchIds.size === roundMatchCount)
    .map(([userId]) => userId)
}

/**
 * Derives “who finished voting this round” and the current user’s votes for the round.
 * `completedUserIds` must come from {@link getCompletedUserIdsForRound} with the same `voteRows`.
 */
export function buildCurrentRoundVotesPayload(
  voteRows: CurrentRoundVoteRow[],
  currentRoundMatchIds: number[],
  completedUserIds: string[],
  usersList: Array<{ id: string; name: string | null; image: string | null }>,
  sessionUserId: string | null
): { voters: CurrentRoundVoter[]; userVotes: Array<{ matchId: number; entryId: number }> } {
  const voters: CurrentRoundVoter[] = []
  const userVotes: Array<{ matchId: number; entryId: number }> = []

  if (currentRoundMatchIds.length === 0) {
    return { voters, userVotes }
  }

  const usersById = new Map(usersList.map((u) => [u.id, u]))
  for (const uid of completedUserIds) {
    const u = usersById.get(uid)
    voters.push({ userId: uid, name: u?.name ?? null, image: u?.image ?? null })
  }

  if (sessionUserId) {
    for (const v of voteRows) {
      if (v.userId === sessionUserId) userVotes.push({ matchId: v.matchId, entryId: v.entryId })
    }
  }

  return { voters, userVotes }
}
