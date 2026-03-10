<script setup lang="ts">
import type { Entry } from '~/stores/competition'

// Protected by global auth middleware (redirects to / if not logged in)

const title = ref('')
const entries = ref<Array<{ title: string; imagePath?: string }>>([])
const newEntryTitle = ref('')
const uploading = ref(false)
const creating = ref(false)
const competitionId = ref<number | null>(null)

async function addEntry() {
  const t = newEntryTitle.value.trim()
  if (!t) return
  entries.value.push({ title: t })
  newEntryTitle.value = ''
}

function removeEntry(index: number) {
  entries.value.splice(index, 1)
}

async function uploadFile(compId: number, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await $fetch<{ pathname: string }>(`/api/competitions/${compId}/entries/upload`, {
    method: 'POST',
    body: form
  })
  return res.pathname
}

async function createCompetition() {
  if (!title.value.trim()) return
  creating.value = true
  try {
    const comp = await $fetch<{ id: number; slug: string }>('/api/competitions', {
      method: 'POST',
      body: { title: title.value.trim() }
    })
    competitionId.value = comp.id
    for (let i = 0; i < entries.value.length; i++) {
      const e = entries.value[i]
      await $fetch(`/api/competitions/${comp.id}/entries`, {
        method: 'POST',
        body: { title: e.title, imagePath: e.imagePath }
      })
    }
    await navigateTo(`/c/${comp.slug}`)
  } finally {
    creating.value = false
  }
}

async function startCompetition() {
  if (!title.value.trim() || entries.value.length < 4) return
  creating.value = true
  try {
    const comp = await $fetch<{ id: number; slug: string }>('/api/competitions', {
      method: 'POST',
      body: { title: title.value.trim() }
    })
    for (const e of entries.value) {
      await $fetch(`/api/competitions/${comp.id}/entries`, {
        method: 'POST',
        body: { title: e.title, imagePath: e.imagePath }
      })
    }
    await $fetch(`/api/competitions/${comp.id}/start`, { method: 'POST' })
    await navigateTo(`/c/${comp.slug}`)
  } finally {
    creating.value = false
  }
}

const validSizes = [4, 8, 16, 32]
const canStart = computed(() => validSizes.includes(entries.value.length))
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
          <NuxtLink to="/create">Create</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="container mx-auto max-w-2xl px-4 py-8">
      <h1 class="text-2xl font-bold text-default">
        Create a competition
      </h1>

      <UFormField label="Competition title" class="mt-6">
        <UInput v-model="title" placeholder="e.g. Best biscuit" />
      </UFormField>

      <div class="mt-8">
        <h2 class="text-lg font-semibold text-default">
          Entries ({{ entries.length }} — need 4, 8, 16, or 32)
        </h2>
        <div class="mt-2 flex gap-2">
          <UInput v-model="newEntryTitle" placeholder="Entry title" @keydown.enter.prevent="addEntry" />
          <UButton @click="addEntry">
            Add
          </UButton>
        </div>
        <ul class="mt-4 space-y-2">
          <li v-for="(e, i) in entries" :key="i" class="flex items-center justify-between rounded-lg border border-muted p-2">
            <span class="text-default">{{ e.title }}</span>
            <UButton variant="ghost" color="error" size="xs" @click="removeEntry(i)">
              Remove
            </UButton>
          </li>
        </ul>
      </div>

      <div class="mt-8 flex gap-4">
        <UButton :disabled="!title.trim() || !canStart || creating" @click="startCompetition">
          Create and start competition
        </UButton>
      </div>
    </main>
  </div>
</template>
