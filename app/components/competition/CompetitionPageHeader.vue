<script setup lang="ts">
import type { Competition } from "~/stores/competition";
import { closeRound, editCompetition } from "~/utils/abilities";

defineProps<{
  title: string;
  competition: Competition;
  canClose: boolean;
  showCloseHint: boolean;
}>();

defineEmits<{
  copyShare: [];
  closeRound: [];
  deleteClick: [];
}>();
</script>

<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <h1 class="text-2xl font-bold text-default">
      {{ title }}
    </h1>
    <div class="flex items-center gap-2">
      <UButton variant="outline" size="sm" @click="$emit('copyShare')">
        Copy share link
      </UButton>
      <Can :ability="closeRound" :args="[competition]">
        <div class="flex flex-col items-end gap-1">
          <UButton
            size="sm"
            :disabled="!canClose"
            @click="$emit('closeRound')"
          >
            Close round
          </UButton>
          <p v-if="showCloseHint" class="text-xs text-muted">
            Add at least one vote to every match to close the round.
          </p>
        </div>
      </Can>
      <Can :ability="editCompetition" :args="[competition]">
        <UButton
          color="error"
          variant="outline"
          size="sm"
          @click="$emit('deleteClick')"
        >
          Delete competition
        </UButton>
      </Can>
    </div>
  </div>
</template>
