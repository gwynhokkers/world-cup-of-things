<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')
const footer = useAppConfig().footer as {
  siteUrl?: string
  siteLabel?: string
  github?: string
  social?: { name: string; url: string; icon: string }[]
}

function clearSession() {
  clear()
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <header class="border-b border-muted shrink-0">
      <div class="container mx-auto flex h-16 items-center justify-between px-4">
        <NuxtLink to="/" class="text-xl font-semibold text-default">
          World Cup of Things
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <NuxtLink to="/" class="text-muted hover:text-default">
            Competitions
          </NuxtLink>
          <NuxtLink to="/create" class="text-muted hover:text-default">
            Create
          </NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/users" class="text-muted hover:text-default">
            Manage
          </NuxtLink>
          <template v-if="loggedIn">
            <UButton variant="ghost" size="sm" @click="clearSession">
              Sign out
            </UButton>
          </template>
          <template v-else>
            <AuthButton />
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-muted shrink-0">
      <div class="container mx-auto flex flex-wrap items-center justify-center gap-4 px-4 py-6 text-sm text-muted">
        <a
          v-if="footer?.siteUrl"
          :href="footer.siteUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-default"
        >
          {{ footer.siteLabel ?? footer.siteUrl }}
        </a>
        <a
          v-if="footer?.github"
          :href="footer.github"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 hover:text-default"
          aria-label="GitHub"
        >
          <UIcon name="i-simple-icons-github" class="size-4" />
          GitHub
        </a>
        <a
          v-for="s in footer?.social ?? []"
          :key="s.url"
          :href="s.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 hover:text-default"
          :aria-label="s.name"
        >
          <UIcon v-if="s.icon" :name="s.icon" class="size-4" />
          {{ s.name }}
        </a>
      </div>
    </footer>
  </div>
</template>
