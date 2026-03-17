<script setup lang="ts">
import type { Entry, Match } from '~/stores/competition'

declare global {
  interface Window {
    JSConfetti?: new () => { addConfetti: (options?: { emojis?: string[] }) => void }
  }
}

interface Voter {
  userId: string
  name: string | null
  image: string | null
}

interface VoteDetail {
  entryId: number
  count: number
  voters: Voter[]
}

interface VoteDetailRow {
  matchId: number
  round: number
  matchIndex: number
  entryAId: number | null
  entryBId: number | null
  winnerId: number | null
  votes: VoteDetail[]
}

interface ResultsData {
  id: number
  title: string
  slug: string
  status: string
  entries: Entry[]
  matches: Match[]
  voteDetails: VoteDetailRow[]
}

const route = useRoute()
const slug = route.params.slug as string

const { data: results, error } = await useFetch<ResultsData>(`/api/competitions/by-slug/${slug}/results`, {
  key: `comp-results-${slug}`
})

// Load js-confetti when results are displayed, then fire confetti (Nuxt Scripts tutorial: https://scripts.nuxt.com/docs/getting-started/confetti-tutorial)
const { onLoaded } = useScriptNpm({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.12.0',
  scriptOptions: {
    use() {
      return { JSConfetti: window.JSConfetti }
    },
    trigger: computed(() => !!results.value)
  }
})
onLoaded(({ JSConfetti }) => {
  const confetti = new JSConfetti()
  confetti.addConfetti({ emojis: ['🎉', '🎊', '✨', '🏆', '⭐'] })
})

const entriesById = computed(() => {
  const entries = results.value?.entries
  if (!entries) return new Map<number, Entry>()
  return new Map(entries.map((e) => [e.id, e]))
})

const matchesByRound = computed(() => {
  const details = results.value?.voteDetails ?? []
  const byRound = new Map<number, VoteDetailRow[]>()
  for (const row of details) {
    const list = byRound.get(row.round) ?? []
    list.push(row)
    byRound.set(row.round, list)
  }
  for (const list of byRound.values()) {
    list.sort((a, b) => a.matchIndex - b.matchIndex)
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  return rounds.map((r) => ({ round: r, matches: byRound.get(r) ?? [] }))
})

const finalWinner = computed(() => {
  const details = results.value?.voteDetails
  const entries = results.value?.entries
  if (!details?.length || !entries?.length) return null
  const lastRound = Math.max(...details.map((d) => d.round))
  const finalMatch = details.find((d) => d.round === lastRound)
  if (!finalMatch?.winnerId) return null
  return entries.find((e) => e.id === finalMatch.winnerId) ?? null
})

function entryFor(match: VoteDetailRow, side: 'A' | 'B'): Entry | null {
  const id = side === 'A' ? match.entryAId : match.entryBId
  return id != null ? entriesById.value.get(id) ?? null : null
}

function votesFor(match: VoteDetailRow, entryId: number | null): VoteDetail | undefined {
  if (entryId == null) return undefined
  return match.votes.find((v) => v.entryId === entryId)
}

function voterDisplayName(v: Voter): string {
  return v.name?.trim() || 'Anonymous'
}
</script>

<template>
  <div>
    <div v-if="error" class="container mx-auto px-4 py-12 text-center">
      <p class="text-muted">
        {{ (error as { data?: { message?: string } })?.data?.message ?? 'Results are not available yet.' }}
      </p>
      <NuxtLink :to="`/comp/${slug}`" class="mt-4 inline-block text-primary">
        Back to competition
      </NuxtLink>
      <NuxtLink to="/" class="ml-4 mt-4 inline-block text-primary">
        Back to home
      </NuxtLink>
    </div>

    <div v-else-if="results" class="container mx-auto px-4 py-8">
      <div class="flex flex-col gap-2">
        <NuxtLink :to="`/comp/${slug}`" class="text-sm text-muted hover:text-default">
          &larr; Back to competition
        </NuxtLink>
        <h1 class="text-2xl font-bold text-default">
          {{ results.title }} — Results
        </h1>
      </div>

      <p class="mt-2 text-muted">
        Full results and who voted for each entry.
      </p>

      <!-- Final winner summary -->
      <div v-if="finalWinner" class="mt-8 rounded-xl border border-primary/30 bg-elevated p-6">
        <h2 class="text-lg font-semibold text-default">
          Winner
        </h2>
        <div class="mt-4 flex items-center gap-4">
          <NuxtImg
            v-if="finalWinner.imagePath"
            :src="`/images/${finalWinner.imagePath}`"
            class="h-20 w-20 rounded object-cover"
          />
          <div v-else class="flex h-20 w-20 items-center justify-center rounded bg-muted text-sm text-muted">
            No image
          </div>
          <span class="text-xl font-medium text-default">{{ finalWinner.title }}</span>
        </div>
      </div>

      <!-- Results by round -->
      <div v-for="{ round, matches } in matchesByRound" :key="round" class="mt-8">
        <h2 class="text-lg font-semibold text-default">
          Round {{ round }}
        </h2>
        <div class="mt-4 grid gap-6 sm:grid-cols-2">
          <div
            v-for="detail in matches"
            :key="detail.matchId"
            class="rounded-xl border border-muted bg-elevated p-4"
          >
            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="side in ['A', 'B']"
                :key="side"
                class="flex flex-col items-center rounded-lg p-4"
                :class="
                  detail.winnerId && entryFor(detail, side)?.id === detail.winnerId
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'bg-muted/30'
                "
              >
                <template v-if="entryFor(detail, side)">
                  <NuxtImg
                    v-if="entryFor(detail, side)!.imagePath"
                    :src="`/images/${entryFor(detail, side)!.imagePath}`"
                    class="h-24 w-24 rounded object-cover"
                  />
                  <div v-else class="flex h-24 w-24 items-center justify-center rounded bg-muted text-center text-sm text-muted">
                    No image
                  </div>
                  <span class="mt-2 font-medium text-default">{{ entryFor(detail, side)!.title }}</span>
                  <template v-if="detail.winnerId && entryFor(detail, side)!.id === detail.winnerId">
                    <span class="mt-1 text-sm font-medium text-primary">Winner</span>
                  </template>
                  <p class="mt-1 text-sm text-muted">
                    {{ votesFor(detail, entryFor(detail, side)!.id)?.count ?? 0 }} votes
                  </p>
                  <div class="mt-2">
                    <UAvatarGroup v-if="votesFor(detail, entryFor(detail, side)!.id)?.voters?.length" :max="3" size="xs">
                      <UTooltip
                        v-for="v in votesFor(detail, entryFor(detail, side)!.id)!.voters"
                        :key="v.userId"
                        :text="voterDisplayName(v)"
                      >
                        <UAvatar
                          :src="v.image ?? undefined"
                          :alt="voterDisplayName(v)"
                          size="xs"
                        />
                      </UTooltip>
                    </UAvatarGroup>
                    <span v-else class="text-xs text-muted">No votes</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="container mx-auto px-4 py-12 text-center">
      <p class="text-muted">
        Loading results…
      </p>
    </div>
  </div>
</template>
