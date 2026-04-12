<script setup lang="ts">
import type { Competition, Entry, Match } from "~/stores/competition";
import type { RoundVoter } from "~/components/competition/RoundVotersAvatars.vue";

interface CurrentRoundVotes {
  voters: RoundVoter[];
  userVotes: Array<{ matchId: number; entryId: number }>;
}

const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;
const store = useCompetitionStore();
const { loggedIn, user } = useUserSession();

await store.fetchBySlug(slug);
const competition = computed(() => store.competition);

const { data: currentRoundVotes, refresh: refreshCurrentRoundVotes } =
  await useFetch<CurrentRoundVotes>(
    () => `/api/competitions/by-slug/${slug}/current-round-votes`,
    { key: `comp-current-round-votes-${slug}` },
  );

/** Votes cast by the current user this session (avoids refetch after voting). */
const optimisticUserVotes = ref(new Map<number, number>());

const userVotesForRound = computed(() => {
  const list = currentRoundVotes.value?.userVotes ?? [];
  const map = new Map(list.map((v) => [v.matchId, v.entryId]));
  for (const [matchId, entryId] of optimisticUserVotes.value)
    map.set(matchId, entryId);
  return map;
});

const currentRoundMatches = computed(() => {
  const c = competition.value;
  if (!c?.matches) return [];
  return c.matches.filter((m) => m.round === c.currentRound);
});

const roundVoters = computed(() => {
  const apiVoters = currentRoundVotes.value?.voters ?? [];
  const matches = currentRoundMatches.value;
  const merged = userVotesForRound.value;
  const userCompleted =
    user.value &&
    matches.length > 0 &&
    matches.every((m) => merged.has(m.id)) &&
    !apiVoters.some((v) => v.userId === user.value!.id);
  if (userCompleted)
    return [
      ...apiVoters,
      {
        userId: user.value!.id,
        name: user.value!.name ?? null,
        image: user.value!.image ?? null,
      },
    ];
  return apiVoters;
});

const entriesById = computed(() => {
  const c = competition.value;
  if (!c?.entries) return new Map<number, Entry>();
  return new Map(c.entries.map((e) => [e.id, e]));
});

const shareUrl = computed(() => {
  if (import.meta.client) return window.location.origin + route.fullPath;
  return "";
});

const votingMatchId = ref<number | null>(null);

function entryFor(match: Match, side: "A" | "B"): Entry | null {
  const id = side === "A" ? match.entryAId : match.entryBId;
  return id != null ? (entriesById.value.get(id) ?? null) : null;
}

async function vote(matchId: number, entryId: number) {
  if (!user.value?.id) return;
  if (userVotesForRound.value.get(matchId) === entryId) return;
  votingMatchId.value = matchId;
  try {
    await $fetch("/api/votes", {
      method: "POST",
      body: { matchId, entryId },
    });
    optimisticUserVotes.value = new Map([
      ...optimisticUserVotes.value,
      [matchId, entryId],
    ]);
    await store.fetchBySlug(slug);
    await refreshCurrentRoundVotes();
  } catch (e) {
    console.error(e);
  } finally {
    votingMatchId.value = null;
  }
}

async function handleCloseRound() {
  if (!competition.value) return;
  try {
    await $fetch(`/api/competitions/${competition.value.id}/rounds/close`, {
      method: "POST",
    });
    await store.fetchBySlug(slug);
  } catch (e) {
    console.error(e);
  }
}

function copyShareLink() {
  if (import.meta.client && shareUrl.value) {
    navigator.clipboard.writeText(shareUrl.value);
  }
}

const isOwner = computed(() => {
  const c = competition.value;
  const u = user.value;
  return c && u && c.ownerId === u.id;
});

const everyMatchHasVote = computed(() => {
  const c = competition.value;
  const counts = c?.voteCountByMatchId;
  if (!counts || !currentRoundMatches.value.length) return false;
  return currentRoundMatches.value.every((m) => (counts[m.id] ?? 0) >= 1);
});

const canClose = computed(
  () =>
    isOwner.value &&
    competition.value?.status === "open" &&
    currentRoundMatches.value.length > 0 &&
    everyMatchHasVote.value,
);

const showCloseHint = computed(
  () =>
    !!isOwner.value &&
    competition.value?.status === "open" &&
    currentRoundMatches.value.length > 0 &&
    !everyMatchHasVote.value,
);

const showDeleteModal = ref(false);
const deleting = ref(false);

async function handleDeleteCompetition() {
  const c = competition.value;
  if (!c?.id) return;
  deleting.value = true;
  try {
    await $fetch(`/api/competitions/${c.id}`, { method: "DELETE" });
    store.clear();
    await router.push("/");
  } catch (e) {
    console.error(e);
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="competition" class="container mx-auto px-4 py-8">
      <CompetitionPageHeader
        :title="competition.title"
        :competition="competition"
        :can-close="canClose"
        :show-close-hint="showCloseHint"
        @copy-share="copyShareLink"
        @close-round="handleCloseRound"
        @delete-click="showDeleteModal = true"
      />

      <p class="mt-2 text-muted">
        {{
          competition.status === "draft"
            ? "Draft"
            : competition.status === "open"
              ? `Round ${competition.currentRound} — vote below`
              : "Completed"
        }}
      </p>

      <RoundVotersAvatars
        v-if="competition.status === 'open' && roundVoters.length"
        :voters="roundVoters"
      />

      <RoundVotingSection
        v-if="competition.status === 'open' && currentRoundMatches.length"
        :round-number="competition.currentRound"
        :show-sign-in-banner="!loggedIn"
      >
        <div class="grid gap-6 sm:grid-cols-2">
          <MatchVoteCard
            v-for="match in currentRoundMatches"
            :key="match.id"
            :entry-a="entryFor(match, 'A')"
            :entry-b="entryFor(match, 'B')"
            :selected-entry-id="userVotesForRound.get(match.id)"
            :loading="votingMatchId === match.id"
            :interactive="loggedIn"
            @pick="(entryId) => vote(match.id, entryId)"
          />
        </div>
      </RoundVotingSection>

      <div
        v-if="competition.status === 'completed' && competition.matches?.length"
        class="mt-8"
      >
        <h2 class="text-lg font-semibold text-default">Winner</h2>
        <p class="mt-2 text-muted">Final round results are in.</p>
        <NuxtLink :to="`/comp/${slug}/results`" class="mt-4 inline-block">
          <UButton variant="outline" size="sm"> View full results </UButton>
        </NuxtLink>
      </div>

      <UModal v-model:open="showDeleteModal">
        <template #content>
          <div class="p-4">
            <h3 class="text-lg font-semibold text-default">
              Delete competition
            </h3>
            <p class="mt-2 text-muted">
              Permanently delete this competition? This cannot be undone.
            </p>
            <div class="mt-4 flex justify-end gap-2">
              <UButton
                variant="outline"
                :disabled="deleting"
                @click="showDeleteModal = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :loading="deleting"
                @click="handleDeleteCompetition"
              >
                Delete
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </div>

    <div v-else class="container mx-auto px-4 py-12 text-center">
      <p class="text-muted">Competition not found.</p>
      <NuxtLink to="/" class="mt-4 inline-block text-primary">
        Back to home
      </NuxtLink>
    </div>
  </div>
</template>
