<script setup lang="ts">
defineProps<{
  roundNumber: number;
  showSignInBanner: boolean;
}>();
</script>

<template>
  <div class="mt-8 space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-default">
        Round {{ roundNumber }} — pick a winner
      </h2>
      <p class="mt-1 text-sm text-muted">
        You can change your pick anytime until the round is closed.
      </p>
    </div>
    <div
      v-if="showSignInBanner"
      class="rounded-lg border border-warning bg-warning/10 p-4 text-warning"
    >
      Sign in with GitHub or Google to vote.
    </div>
    <slot />
  </div>
</template>
