<script setup lang="ts">
export interface RoundVoter {
  userId: string;
  name: string | null;
  image: string | null;
}

defineProps<{
  voters: RoundVoter[];
}>();

function voterDisplayName(v: RoundVoter): string {
  return v.name?.trim() || "Anonymous";
}
</script>

<template>
  <div v-if="voters.length" class="mt-2 flex items-center gap-2">
    <span class="text-sm text-muted">Voted this round:</span>
    <UAvatarGroup :max="5" size="xs">
      <UTooltip
        v-for="v in voters"
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
  </div>
</template>
