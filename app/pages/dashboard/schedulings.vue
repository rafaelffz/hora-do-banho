<script lang="ts" setup>
import type { SchedulingData } from "~/types/scheduling"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Agendamentos",
})

const viewMode = ref<"timeline" | "calendar">("timeline")
const isCreateModalOpen = ref(false)

const {
  data: timelineSchedulings,
  pending: timelinePending,
  refresh: refreshTimeline,
} = useFetch<SchedulingData[]>("/api/schedulings", {
  query: { next30Days: "true" },
})

const { data: schedulingStats, refresh: refreshStats } = useFetch("/api/schedulings/stats", {
  query: { next30Days: "true" },
})

const {
  data: calendarSchedulings,
  pending: calendarPending,
  refresh: refreshCalendar,
} = useFetch<SchedulingData[]>("/api/schedulings")

const schedulingsData = computed(() => {
  if (viewMode.value === "timeline") {
    return timelineSchedulings.value || []
  }

  return calendarSchedulings.value || []
})

const isDataLoading = computed(() => {
  return viewMode.value === "timeline" ? timelinePending.value : calendarPending.value
})

const switchToTimeline = () => {
  viewMode.value = "timeline"
}

const switchToCalendar = () => {
  viewMode.value = "calendar"
}

const statistics = computed(() => {
  if (schedulingStats.value) {
    return {
      total: schedulingStats.value.schedulings.total,
      scheduled: schedulingStats.value.schedulings.scheduled,
      completed: schedulingStats.value.schedulings.completed,
    }
  }

  const data = timelineSchedulings.value || []
  const total = data.length
  const scheduled = data.filter(
    (item: SchedulingData) => item.scheduling.status === "scheduled"
  ).length
  const completed = data.filter(
    (item: SchedulingData) => item.scheduling.status === "completed"
  ).length

  const totalRevenue = data
    .filter((item: SchedulingData) => item.scheduling.status === "completed")
    .reduce((sum: number, item: SchedulingData) => sum + item.scheduling.finalPrice, 0)

  return {
    total,
    scheduled,
    completed,
    totalRevenue,
    activeSubscriptions: 0,
    estimatedRevenue: 0,
  }
})

function formatCurrency(value: number | string) {
  const numericValue = typeof value === "string" ? parseFloat(value) : value

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue)
}

function handleRefresh() {
  refreshTimeline()
  refreshStats()
  refreshCalendar()
}

function openCreateModal() {
  isCreateModalOpen.value = true
}

function closeCreateModal() {
  isCreateModalOpen.value = false
}

function handleSchedulingCreated() {
  handleRefresh()
  closeCreateModal()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon name="i-tabler-calendar" size="24" />
        Agendamentos
      </h1>

      <div class="flex gap-2">
        <UButton icon="i-tabler-plus" class="cursor-pointer text-white" @click="openCreateModal">
          Adicionar
        </UButton>
      </div>
    </div>

    <div v-if="viewMode === 'timeline'" class="grid grid-cols-2 sm:grid-cols-2 gap-3">
      <StatisticCard title="Agendados" :statistics="statistics.scheduled" icon="i-tabler-clock" />
      <StatisticCard
        title="Concluídos"
        :statistics="statistics.completed"
        icon="i-tabler-rosette-discount-check"
      />
    </div>

    <div class="flex items-center justify-center">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1"
      >
        <div class="grid grid-cols-2 gap-1">
          <UButton
            color="primary"
            :class="[
              'text-white flex items-center text-sm justify-center',
              viewMode !== 'timeline'
                ? 'dark:bg-gray-800 dark:text-white bg-white text-black '
                : '',
            ]"
            @click="switchToTimeline"
          >
            <Icon name="i-tabler-list" size="16" />
            Próximos 30 dias
          </UButton>

          <UButton
            @click="switchToCalendar"
            :class="[
              'text-white flex items-center text-sm justify-center',
              viewMode !== 'calendar'
                ? 'dark:bg-gray-800 dark:text-white bg-white text-black '
                : '',
            ]"
            color="primary"
          >
            <Icon name="i-tabler-calendar" size="16" />
            Calendário
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="isDataLoading" class="flex justify-center py-12">
      <div class="flex items-center gap-3">
        <Icon name="i-tabler-loader-2" size="24" class="animate-spin" />
        <span>Carregando agendamentos...</span>
      </div>
    </div>

    <div v-else>
      <div
        v-if="viewMode === 'timeline'"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center gap-2 mb-6">
          <Icon name="i-tabler-timeline" size="24" />
          <h2 class="text-xl font-semibold">Próximos 30 dias</h2>
        </div>

        <SchedulingTimeline :schedulings="schedulingsData" @refresh="handleRefresh" />
      </div>

      <div
        v-else
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center gap-2 mb-6">
          <Icon name="i-tabler-calendar-month" size="20" />
          <h2 class="text-lg font-semibold">Calendário de Agendamentos</h2>
        </div>

        <SchedulingCalendar :schedulings="schedulingsData" />
      </div>
    </div>

    <CreateSchedulingModal
      v-model="isCreateModalOpen"
      @close="closeCreateModal"
      @success="handleSchedulingCreated"
    />
  </div>
</template>
