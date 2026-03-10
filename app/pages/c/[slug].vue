<script setup lang="ts">
import type { Competition, Entry, Match } from '~/stores/competition'
import { closeRound } from '~/utils/abilities'

const route = useRoute()
const slug = route.params.slug as string
const store = useCompetitionStore()
const { loggedIn, user } = useUserSession()

await store.fetchBySlug(slug)
const competition = computed(() => store.competition)

const entriesById = computed(() => {
  const c = competition.value
  if (!c?.entries) return new Map<number, Entry>()
  return new Map(c.entries.map((e) => [e.id, e]))
})

const currentRoundMatches = computed(() => {
  const c = competition.value
  if (!c?.matches) return []
  return c.matches.filter((m) => m.round === c.currentRound)
})

const shareUrl = computed(() => {
  if (import.meta.client) return window.location.origin + route.fullPath
  return ''
})

const votedMatchIds = ref<Set<number>>(new Set())
const votingMatchId = ref<number | null>(null)

function entryFor(match: Match, side: 'A' | 'B'): Entry | null {
  const id = side === 'A' ? match.entryAId : match.entryBId
  return id != null ? entriesById.value.get(id) ?? null : null
}

async function vote(matchId: number, entryId: number) {
  if (!user.value?.id) return
  votingMatchId.value = matchId
  try {
    await $fetch('/api/votes', {
      method: 'POST',
      body: { matchId, entryId }
    })
    votedMatchIds.value = new Set([...votedMatchIds.value, matchId])
    await store.fetchBySlug(slug)
  } catch (e) {
    console.error(e)
  } finally {
    votingMatchId.value = null
  }
}

async function handleCloseRound() {
  if (!competition.value) return
  try {
    await $fetch(`/api/competitions/${competition.value.id}/rounds/close`, { method: 'POST' })
    await store.fetchBySlug(slug)
  } catch (e) {
    console.error(e)
  }
}

function copyShareLink() {
  if (import.meta.client && shareUrl.value) {
    navigator.clipboard.writeText(shareUrl.value)
  }
}

const isOwner = computed(() => {
  const c = competition.value
  const u = user.value
  return c && u && c.ownerId === u.id
})

const canClose = computed(() => isOwner.value && competition.value?.status === 'open' && currentRoundMatches.value.length > 0)
</script>

<template>
  <div class="min-h-screen bg-default">
    <header class="border-b border-muted">
      <div class="container mx-auto flex h-16 items-center justify-between px-4">
        <NuxtLink to="/" class="text-xl font-semibold text-default">
          World Cup of Things
        </NuxtLink>
        <nav class="flex gap-4">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink v-if="loggedIn" to="/create">Create</NuxtLink>
        </nav>
      </div>
    </header>

    <main v-if="competition" class="container mx-auto px-4 py-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-bold text-default">
          {{ competition.title }}
        </h1>
        <div class="flex items-center gap-2">
          <UButton variant="outline" size="sm" @click="copyShareLink">
            Copy share link
          </UButton>
          <Can :ability="closeRound" :args="[competition]">
            <UButton size="sm" :disabled="!canClose" @click="handleCloseRound">
              Close round
            </UButton>
          </Can>
        </div>
      </div>

      <p class="mt-2 text-muted">
        {{ competition.status === 'draft' ? 'Draft' : competition.status === 'open' ? `Round ${competition.currentRound} — vote below` : 'Completed' }}
      </p>

      <!-- Voting: current round matches -->
      <div v-if="competition.status === 'open' && currentRoundMatches.length" class="mt-8 space-y-6">
        <h2 class="text-lg font-semibold text-default">
          Round {{ competition.currentRound }} — pick a winner
        </h2>
        <div v-if="!loggedIn" class="rounded-lg border border-warning bg-warning/10 p-4 text-warning">
          Sign in with GitHub or Google to vote.
        </div>
        <div class="grid gap-6 sm:grid-cols-2">
          <div
            v-for="match in currentRoundMatches"
            :key="match.id"
            class="rounded-xl border border-muted bg-elevated p-4"
          >
            <div class="grid grid-cols-2 gap-4">
              <button
                v-for="side in ['A', 'B']"
                :key="side"
                type="button"
                class="flex flex-col items-center rounded-lg border-2 p-4 transition-colors"
                :class="votedMatchIds.has(match.id) ? 'border-muted' : 'border-muted hover:border-primary'"
                :disabled="votedMatchIds.has(match.id) || votingMatchId === match.id"
                @click="entryFor(match, side) && vote(match.id, entryFor(match, side)!.id)"
              >
                <template v-if="entryFor(match, side)">
                  <NuxtImg
                    v-if="entryFor(match, side)!.imagePath"
                    :src="`/images/${entryFor(match, side)!.imagePath}`"
                    class="h-24 w-24 rounded object-cover"
                  />
                  <div v-else class="flex h-24 w-24 items-center justify-center rounded bg-muted text-center text-sm text-muted">
                    No image
                  </div>
                  <span class="mt-2 font-medium text-default">{{ entryFor(match, side)!.title }}</span>
                </template>
              </button>
            </div>
            <p v-if="votedMatchIds.has(match.id)" class="mt-2 text-center text-sm text-success">
              Voted
            </p>
          </div>
        </div>
      </div>

      <!-- Completed: show winner -->
      <div v-if="competition.status === 'completed' && competition.matches?.length" class="mt-8">
        <h2 class="text-lg font-semibold text-default">
          Winner
        </h2>
        <p class="mt-2 text-muted">
          Final round results are in.
        </p>
      </div>
    </main>

    <main v-else class="container mx-auto px-4 py-12 text-center">
      <p class="text-muted">
        Competition not found.
      </p>
      <NuxtLink to="/" class="mt-4 inline-block text-primary">
        Back to home
      </NuxtLink>
    </main>
  </div>
</template>
