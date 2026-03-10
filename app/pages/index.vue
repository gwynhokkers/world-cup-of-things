<script setup lang="ts">
const { loggedIn, clear } = useUserSession()
function clearSession() {
  clear()
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <header class="border-b border-muted">
      <div class="container mx-auto flex h-16 items-center justify-between px-4">
        <NuxtLink to="/" class="text-xl font-semibold text-default">
          World Cup of Things
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <NuxtLink to="/" class="text-muted hover:text-default">
            Home
          </NuxtLink>
          <template v-if="loggedIn">
            <NuxtLink to="/create" class="text-muted hover:text-default">
              Create
            </NuxtLink>
            <UButton variant="ghost" size="sm" @click="clearSession">
              Sign out
            </UButton>
          </template>
          <template v-else>
            <UButton as="a" href="/auth/github" variant="outline" size="sm">
              Login with GitHub
            </UButton>
            <UButton as="a" href="/auth/google" variant="outline" size="sm">
              Login with Google
            </UButton>
          </template>
        </nav>
      </div>
    </header>

    <main class="container mx-auto px-4 py-12">
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
            <UButton as="a" href="/auth/github" size="lg">
              Sign in with GitHub to create
            </UButton>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>
