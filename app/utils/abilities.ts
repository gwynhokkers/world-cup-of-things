export interface SessionUser {
  id?: string
  email?: string
  name?: string
  avatar?: string
  provider?: string
}

export interface CompetitionForAuth {
  ownerId: string
  status: string
}

export const createCompetition = defineAbility((user: SessionUser | null) => {
  return !!user?.id
})

export const editCompetition = defineAbility(
  (user: SessionUser | null, competition: CompetitionForAuth) => {
    if (!user?.id) return false
    return competition.ownerId === user.id
  }
)

export const voteOnCompetition = defineAbility(
  (user: SessionUser | null, competition: CompetitionForAuth) => {
    if (!user?.id) return false
    return competition.status === 'open'
  }
)

export const closeRound = defineAbility(
  (user: SessionUser | null, competition: CompetitionForAuth) => {
    if (!user?.id) return false
    return competition.ownerId === user.id && competition.status === 'open'
  }
)

export const viewCompetition = defineAbility(() => true)
