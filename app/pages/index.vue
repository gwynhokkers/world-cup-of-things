<script setup lang="ts">
interface MineCompetition {
  id: number
  title: string
  slug: string
  status: string
  createdAt: string
}

const { loggedIn } = useUserSession()
const { data: myCompetitions, pending } = await useAsyncData<MineCompetition[]>(
  'my-competitions',
  () => (!loggedIn.value ? Promise.resolve([]) : $fetch('/api/competitions/mine')),
  { watch: [loggedIn] }
)
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div class="mx-auto max-w-2xl text-center">
      <h1 class="text-4xl font-bold text-default">
        Create a bracket. Share the link. Vote for the winner.
      </h1>
      <p class="mt-4 text-muted">
        Add things (with a title or image), start the competition, and invite others to vote round by round until one wins.
      </p>
      <div class="mt-8 flex justify-center gap-4">
        <NuxtLink v-if="loggedIn" to="/create">
          <UButton size="lg">
            Create a competition
          </UButton>
        </NuxtLink>
        <template v-else>
          <AuthButton />
        </template>
      </div>
    </div>

    <section v-if="loggedIn" class="mx-auto mt-16 max-w-2xl">
      <h2 class="text-xl font-semibold text-default">
        My competitions
      </h2>
      <div v-if="pending" class="mt-4 text-sm text-muted">
        Loading…
      </div>
      <ul v-else-if="myCompetitions?.length" class="mt-4 space-y-2">
        <li
          v-for="c in myCompetitions"
          :key="c.id"
          class="flex items-center justify-between rounded-lg border border-muted bg-elevated px-4 py-3"
        >
          <div>
            <span class="font-medium text-default">{{ c.title }}</span>
            <UBadge
              :color="c.status === 'completed' ? 'neutral' : c.status === 'open' ? 'success' : 'warning'"
              variant="subtle"
              size="xs"
              class="ml-2"
            >
              {{ c.status }}
            </UBadge>
          </div>
          <NuxtLink :to="`/comp/${c.slug}`" class="text-primary hover:underline">
            Open
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="mt-4 text-sm text-muted">
        You haven’t created any competitions yet. Use Create to get started.
      </p>
    </section>
  </div>
</template>
