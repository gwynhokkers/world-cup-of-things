<script setup lang="ts">
import type { Entry } from "~/stores/competition";

const props = defineProps<{
  entryA: Entry | null;
  entryB: Entry | null;
  /** Current user's pick for this match, if any */
  selectedEntryId: number | undefined;
  loading: boolean;
  /** false when not signed in */
  interactive: boolean;
}>();

const emit = defineEmits<{
  pick: [entryId: number];
}>();

const rows = computed(() =>
  (["A", "B"] as const).map((side) => ({
    side,
    entry: side === "A" ? props.entryA : props.entryB,
  })),
);

function isSelected(entry: Entry): boolean {
  return props.selectedEntryId === entry.id;
}

function onChoose(entry: Entry | null) {
  if (!entry || !props.interactive || props.loading) return;
  if (props.selectedEntryId === entry.id) return;
  emit("pick", entry.id);
}

const hasPick = computed(
  () =>
    props.selectedEntryId != null &&
    (props.entryA?.id === props.selectedEntryId ||
      props.entryB?.id === props.selectedEntryId),
);
</script>

<template>
  <div class="rounded-xl border border-muted bg-elevated p-4">
    <div class="grid grid-cols-2 gap-4">
      <button
        v-for="row in rows"
        :key="row.side"
        type="button"
        class="flex flex-col items-center rounded-lg border-2 p-4 transition-colors"
        :class="[
          interactive && !loading
            ? 'border-muted hover:border-primary'
            : 'border-muted',
          row.entry && isSelected(row.entry)
            ? 'ring-2 ring-primary bg-primary/10'
            : '',
        ]"
        :disabled="!interactive || loading"
        @click="onChoose(row.entry)"
      >
        <template v-if="row.entry">
          <NuxtImg
            v-if="row.entry.imagePath"
            :src="`/images/${row.entry.imagePath}`"
            class="h-24 w-24 rounded object-cover"
          />
          <div
            v-else
            class="flex h-24 w-24 items-center justify-center rounded bg-muted text-center text-sm text-muted"
          >
            No image
          </div>
          <span class="mt-2 font-medium text-default">{{ row.entry.title }}</span>
        </template>
      </button>
    </div>
    <p v-if="hasPick" class="mt-2 text-center text-sm text-muted">Your pick</p>
  </div>
</template>
