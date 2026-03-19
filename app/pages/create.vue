<script setup lang="ts">
// Protected by global auth middleware (redirects to / if not logged in)

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const UPLOAD_MAX_DIMENSION = 1920
const UPLOAD_JPEG_QUALITY = 0.82
const COMPRESS_IF_LARGER_THAN = 1.5 * 1024 * 1024 // 1.5MB – compress so mobile uploads succeed

type CreateEntry = {
  title: string
  imagePath?: string
  file?: File | null
  previewUrl?: string
}

const title = ref('')
const entries = ref<CreateEntry[]>([])
const newEntryTitle = ref('')
const uploading = ref(false)
const creating = ref(false)
const competitionId = ref<number | null>(null)
const uploadError = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingEntryIndex = ref<number | null>(null)

function entryPreviewSrc(e: CreateEntry): string | undefined {
  if (e.previewUrl) return e.previewUrl
  if (e.imagePath) return `/images/${e.imagePath}`
  return undefined
}

function hasImage(e: CreateEntry): boolean {
  return !!(e.file || e.previewUrl || e.imagePath)
}

function revokePreview(entry: CreateEntry) {
  if (entry.previewUrl) {
    URL.revokeObjectURL(entry.previewUrl)
    entry.previewUrl = undefined
  }
}

async function addEntry() {
  const t = newEntryTitle.value.trim()
  if (!t) return
  entries.value.push({ title: t })
  newEntryTitle.value = ''
}

function removeEntry(index: number) {
  const entry = entries.value[index]
  if (entry) revokePreview(entry)
  entries.value.splice(index, 1)
}

function triggerFileInput(index: number) {
  pendingEntryIndex.value = index
  fileInputRef.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const idx = pendingEntryIndex.value
  pendingEntryIndex.value = null
  input.value = ''
  const entry = idx != null && idx >= 0 && idx < entries.value.length ? entries.value[idx] : undefined
  if (entry == null || !file) return

  if (!ALLOWED_TYPES.includes(file.type)) {
    uploadError.value = 'Please choose a JPEG, PNG or WebP image.'
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    uploadError.value = 'Image must be 10MB or smaller.'
    return
  }
  uploadError.value = null

  revokePreview(entry)
  entry.file = file
  entry.previewUrl = URL.createObjectURL(file)
  entry.imagePath = undefined
}

function removeImage(index: number) {
  const entry = entries.value[index]
  if (entry == null) return
  revokePreview(entry)
  entry.file = null
  entry.imagePath = undefined
}

/** Resize and compress image for upload so mobile / Cloudflare don't timeout on large camera photos. */
async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= COMPRESS_IF_LARGER_THAN || !ALLOWED_TYPES.includes(file.type)) return file
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w <= UPLOAD_MAX_DIMENSION && h <= UPLOAD_MAX_DIMENSION) {
        resolve(file)
        return
      }
      const scale = UPLOAD_MAX_DIMENSION / Math.max(w, h)
      const cw = Math.round(w * scale)
      const ch = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, cw, ch)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const name = file.name.replace(/\.[^.]+$/i, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        UPLOAD_JPEG_QUALITY
      )
    }
    img.src = url
  })
}

async function uploadFile(compId: number, file: File): Promise<string> {
  const toUpload = await compressImageForUpload(file)
  const form = new FormData()
  form.append('file', toUpload)
  const res = await $fetch<{ pathname: string }>(`/api/competitions/${compId}/entries/upload`, {
    method: 'POST',
    body: form,
    timeout: 90_000 // 90s for slow mobile uploads on Cloudflare
  })
  return res.pathname
}

async function createCompetition() {
  if (!title.value.trim()) return
  creating.value = true
  uploadError.value = null
  try {
    const comp = await $fetch<{ id: number; slug: string }>('/api/competitions', {
      method: 'POST',
      body: { title: title.value.trim() }
    })
    competitionId.value = comp.id
    for (let i = 0; i < entries.value.length; i++) {
      const e = entries.value[i]
      if (!e) continue
      if (e.file) {
        uploading.value = true
        try {
          e.imagePath = await uploadFile(comp.id, e.file)
          revokePreview(e)
          e.file = null
        } catch (err: any) {
          const msg = err?.data?.message || err?.message || ''
          const isNetwork = !msg || /fetch|network|timeout/i.test(msg)
          uploadError.value = isNetwork
            ? 'Upload failed—check your connection or try a smaller image.'
            : (msg || 'Upload failed')
          return
        } finally {
          uploading.value = false
        }
      }
      await $fetch(`/api/competitions/${comp.id}/entries`, {
        method: 'POST',
        body: { title: e.title, imagePath: e.imagePath }
      })
    }
    await navigateTo(`/comp/${comp.slug}`)
  } finally {
    creating.value = false
  }
}

async function startCompetition() {
  if (!title.value.trim() || entries.value.length < 4) return
  creating.value = true
  uploadError.value = null
  try {
    const comp = await $fetch<{ id: number; slug: string }>('/api/competitions', {
      method: 'POST',
      body: { title: title.value.trim() }
    })
    for (let i = 0; i < entries.value.length; i++) {
      const e = entries.value[i]
      if (!e) continue
      if (e.file) {
        uploading.value = true
        try {
          e.imagePath = await uploadFile(comp.id, e.file)
          revokePreview(e)
          e.file = null
        } catch (err: any) {
          const msg = err?.data?.message || err?.message || ''
          const isNetwork = !msg || /fetch|network|timeout/i.test(msg)
          uploadError.value = isNetwork
            ? 'Upload failed—check your connection or try a smaller image.'
            : (msg || 'Upload failed')
          return
        } finally {
          uploading.value = false
        }
      }
      await $fetch(`/api/competitions/${comp.id}/entries`, {
        method: 'POST',
        body: { title: e.title, imagePath: e.imagePath }
      })
    }
    await $fetch(`/api/competitions/${comp.id}/start`, { method: 'POST' })
    await navigateTo(`/comp/${comp.slug}`)
  } finally {
    creating.value = false
  }
}

const validSizes = [4, 8, 16, 32]
const canStart = computed(() => validSizes.includes(entries.value.length))

onUnmounted(() => {
  entries.value.forEach((e) => { if (e) revokePreview(e) })
})
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
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
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="onFileChange"
        >
        <ul class="mt-4 space-y-2">
          <li v-for="(e, i) in entries" :key="i" class="flex items-center gap-3 rounded-lg border border-muted p-2">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
              <img
                v-if="entryPreviewSrc(e)"
                :src="entryPreviewSrc(e)"
                alt=""
                class="h-full w-full object-cover"
              >
              <span v-else class="text-center text-xs text-muted">
                No image
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <span class="text-default">{{ e.title }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <UButton variant="ghost" size="xs" @click="triggerFileInput(i)">
                {{ hasImage(e) ? 'Change' : 'Add image' }}
              </UButton>
              <UButton
                v-if="hasImage(e)"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="removeImage(i)"
              >
                Remove image
              </UButton>
              <UButton variant="ghost" color="error" size="xs" @click="removeEntry(i)">
                Remove
              </UButton>
            </div>
          </li>
        </ul>
        <p v-if="uploadError" class="mt-2 text-sm text-error">
          {{ uploadError }}
        </p>
      </div>

      <div class="mt-8 flex flex-col gap-2">
        <p v-if="uploading" class="text-sm text-muted">
          Uploading images…
        </p>
        <UButton :disabled="!title.trim() || !canStart || creating || uploading" @click="startCompetition">
          Create and start competition
        </UButton>
      </div>
  </div>
</template>
