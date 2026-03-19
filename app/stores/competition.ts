import { defineStore } from 'pinia'

export interface Entry {
  id: number
  competitionId: number
  title: string
  imagePath: string | null
  seed: number
}

export interface Match {
  id: number
  competitionId: number
  round: number
  matchIndex: number
  entryAId: number | null
  entryBId: number | null
  winnerId: number | null
}

export interface Competition {
  id: number
  ownerId: string
  title: string
  slug: string
  status: 'draft' | 'open' | 'completed'
  currentRound: number
  createdAt: Date
  entries?: Entry[]
  matches?: Match[]
  voteCountByMatchId?: Record<number, number>
}

export const useCompetitionStore = defineStore('competition', {
  state: () => ({
    competition: null as Competition | null
  }),

  getters: {
    entriesById(state): Map<number, Entry> {
      if (!state.competition?.entries) return new Map()
      return new Map(state.competition.entries.map((e) => [e.id, e]))
    },
    currentRoundMatches(state): Match[] {
      if (!state.competition?.matches || !state.competition) return []
      return state.competition.matches.filter((m) => m.round === state.competition!.currentRound)
    }
  },

  actions: {
    async fetchBySlug(slug: string) {
      const data = await $fetch<Competition>(`/api/competitions/by-slug/${slug}`)
      this.competition = data
      return data
    },
    async fetchById(id: number) {
      const data = await $fetch<Competition>(`/api/competitions/${id}`)
      this.competition = data
      return data
    },
    clear() {
      this.competition = null
    }
  }
})
