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
const isLoading = ref(false)

const {
  data: timelineSchedulings,
  pending: timelinePending,
  refresh: refreshTimeline,
} = await useFetch<SchedulingData[]>("/api/schedulings", {
  query: { next30Days: "true" },
})

// Buscar todos os agendamentos para o calendário
const {
  data: calendarSchedulings,
  pending: calendarPending,
  refresh: refreshCalendar,
} = await useFetch<SchedulingData[]>("/api/schedulings")

const schedulingsData = computed(() => {
  if (viewMode.value === "timeline") {
    return timelineSchedulings.value || []
  }
  return calendarSchedulings.value || []
})

const isDataLoading = computed(() => {
  return viewMode.value === "timeline" ? timelinePending.value : calendarPending.value
})

function switchToTimeline() {
  viewMode.value = "timeline"
}

function switchToCalendar() {
  viewMode.value = "calendar"
}

async function refreshData() {
  isLoading.value = true
  try {
    if (viewMode.value === "timeline") {
      await refreshTimeline()
    } else {
      await refreshCalendar()
    }
  } finally {
    isLoading.value = false
  }
}

// Estatísticas dos próximos 30 dias
const statistics = computed(() => {
  const data = timelineSchedulings.value || []

  const total = data.length
  const confirmed = data.filter(
    (item: SchedulingData) => item.scheduling.status === "confirmed"
  ).length
  const scheduled = data.filter(
    (item: SchedulingData) => item.scheduling.status === "scheduled"
  ).length
  const completed = data.filter(
    (item: SchedulingData) => item.scheduling.status === "completed"
  ).length

  const totalRevenue = data
    .filter((item: SchedulingData) => item.scheduling.status === "completed")
    .reduce((sum: number, item: SchedulingData) => sum + item.scheduling.totalPrice, 0)

  return {
    total,
    confirmed,
    scheduled,
    completed,
    totalRevenue,
  }
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Icon name="i-tabler-calendar" size="28" />
          Agendamentos
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Gerencie seus agendamentos e visualize sua agenda
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          variant="outline"
          icon="i-tabler-refresh"
          :loading="isLoading"
          @click="refreshData"
        >
          Atualizar
        </UButton>
        <UButton icon="i-tabler-plus"> Novo Agendamento </UButton>
      </div>
    </div>

    <!-- Estatísticas (apenas na view timeline) -->
    <div
      v-if="viewMode === 'timeline'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
            <p class="text-2xl font-bold">{{ statistics.total }}</p>
          </div>
          <Icon name="i-tabler-calendar-stats" size="24" class="text-blue-500" />
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Agendados</p>
            <p class="text-2xl font-bold">{{ statistics.scheduled }}</p>
          </div>
          <Icon name="i-tabler-clock" size="24" class="text-yellow-500" />
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Confirmados</p>
            <p class="text-2xl font-bold">{{ statistics.confirmed }}</p>
          </div>
          <Icon name="i-tabler-check" size="24" class="text-green-500" />
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Concluídos</p>
            <p class="text-2xl font-bold">{{ statistics.completed }}</p>
          </div>
          <Icon name="i-tabler-check-circle" size="24" class="text-gray-500" />
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Receita</p>
            <p class="text-xl font-bold text-green-600">
              {{ formatCurrency(statistics.totalRevenue) }}
            </p>
          </div>
          <Icon name="i-tabler-coins" size="24" class="text-green-500" />
        </div>
      </div>
    </div>

    <!-- Toggle de visualização -->
    <div class="flex items-center justify-center">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1"
      >
        <div class="grid grid-cols-2 gap-1">
          <button
            @click="switchToTimeline"
            :class="[
              'flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              viewMode === 'timeline'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            ]"
          >
            <Icon name="i-tabler-list" size="16" />
            Timeline (30 dias)
          </button>
          <button
            @click="switchToCalendar"
            :class="[
              'flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              viewMode === 'calendar'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            ]"
          >
            <Icon name="i-tabler-calendar" size="16" />
            Calendário
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isDataLoading" class="flex justify-center py-12">
      <div class="flex items-center gap-3">
        <Icon name="i-tabler-loader-2" size="24" class="animate-spin" />
        <span>Carregando agendamentos...</span>
      </div>
    </div>

    <!-- Conteúdo principal -->
    <div v-else>
      <!-- Timeline View -->
      <div
        v-if="viewMode === 'timeline'"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div class="flex items-center gap-2 mb-6">
          <Icon name="i-tabler-timeline" size="20" />
          <h2 class="text-lg font-semibold">Próximos 30 dias</h2>
        </div>

        <SchedulingTimeline :schedulings="schedulingsData" />
      </div>

      <!-- Calendar View -->
      <div
        v-else
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div class="flex items-center gap-2 mb-6">
          <Icon name="i-tabler-calendar-month" size="20" />
          <h2 class="text-lg font-semibold">Calendário de Agendamentos</h2>
        </div>

        <SchedulingCalendar :schedulings="schedulingsData" />
      </div>
    </div>
  </div>
</template>
