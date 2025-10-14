<script lang="ts" setup>
const props = defineProps<{
  title: string
  icon?: string
  subtitle?: string
  statistics: string | number
}>()
</script>

<template>
  <UPageCard variant="subtle" class="flex-1" :ui="{ body: 'flex-1 w-full' }">
    <template #title>
      <div class="flex items-start w-full justify-between">
        <div class="flex flex-col sm:flex-row sm:items-center sm:gap-1 flex-wrap">
          <h2 class="text-base md:text-lg font-semibold">{{ props.title }}</h2>
          <span class="text-xs text-muted">{{ props.subtitle }}</span>
        </div>
        <Icon :name="props.icon || 'i-tabler-chart-pie'" size="24" />
      </div>
    </template>

    <template #description>
      <div class="text-2xl md:text-3xl font-bold">
        {{ props.statistics }}
      </div>
    </template>
  </UPageCard>
</template>
