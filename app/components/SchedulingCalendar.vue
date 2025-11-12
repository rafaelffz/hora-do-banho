<script lang="ts" setup>
import { CalendarDate } from "@internationalized/date"
import { formatISO } from "date-fns"
import type { SchedulingData, SchedulingEvent } from "~/types/scheduling"

interface Props {
  schedulings: SchedulingData[]
}

const props = defineProps<Props>()

function dateToCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function calendarDateToDate(calendarDate: CalendarDate): Date {
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
}

const selectedDate = shallowRef(dateToCalendarDate(new Date()))

const calendarEvents = computed(() => {
  return props.schedulings.map(
    item =>
      ({
        id: item.scheduling.id,
        title: `${item.client.name} - ${item.pets.map(p => p.name).join(", ")}`,
        date: new Date(item.scheduling.pickupDate),
        time: new Date(item.scheduling.pickupDate).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        client: {
          name: item.client.name,
          phone: item.client.phone,
        },
        pets: item.pets,
        status: item.scheduling.status,
        basePrice: item.scheduling.basePrice,
        finalPrice: item.scheduling.finalPrice,
        adjustmentValue: item.scheduling.adjustmentValue,
        adjustmentReason: item.scheduling.adjustmentReason,
      } as SchedulingEvent)
  )
})

const eventsByDate = computed(() => {
  const grouped: Record<string, SchedulingEvent[]> = {}

  calendarEvents.value.forEach(event => {
    const date = formatISO(event.date, { representation: "date" })

    if (!grouped[date]) {
      grouped[date] = []
    }

    grouped[date].push(event)
  })

  return grouped
})

const selectedDateEvents = computed(() => {
  const selectedJsDate = calendarDateToDate(selectedDate.value)
  const date = formatISO(selectedJsDate, { representation: "date" })
  return eventsByDate.value[date] || []
})

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

function getColorByDate(date: Date) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dateStr = formatISO(localDate, { representation: "date" })
  const eventsForDate = eventsByDate.value[dateStr]

  if (!eventsForDate || eventsForDate.length === 0) {
    return undefined
  }

  const hasConfirmed = eventsForDate.some(event => event.status === "confirmed")
  const hasInProgress = eventsForDate.some(event => event.status === "in_progress")
  const hasCancelled = eventsForDate.some(event => event.status === "cancelled")
  const hasCompleted = eventsForDate.some(event => event.status === "completed")

  if (hasCancelled) return "error"
  if (hasInProgress) return "warning"
  if (hasConfirmed) return "success"
  if (hasCompleted) return "neutral"

  return "primary"
}

function getStatusColor(
  status: string
): "primary" | "success" | "warning" | "neutral" | "error" | "secondary" | "info" {
  const statusColors: Record<
    string,
    "primary" | "success" | "warning" | "neutral" | "error" | "secondary" | "info"
  > = {
    scheduled: "neutral",
    in_progress: "warning",
    completed: "success",
    cancelled: "error",
  }

  return statusColors[status] || "primary"
}

function goToToday() {
  selectedDate.value = dateToCalendarDate(new Date())
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="flex-1">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">Calendário de Agendamentos</h2>
          <div class="flex items-center gap-2">
            <UButton variant="outline" size="sm" @click="goToToday"> Hoje </UButton>
          </div>
        </div>

        <UCalendar v-model="selectedDate">
          <template #day="{ day }">
            <UChip
              :show="!!getColorByDate(day.toDate('America/Sao_Paulo'))"
              :color="getColorByDate(day.toDate('America/Sao_Paulo'))"
              size="2xs"
            >
              {{ day.day }}
            </UChip>
          </template>
        </UCalendar>
      </div>
    </div>

    <div class="w-full lg:w-96">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 class="text-lg font-bold mb-4">
          Agendamentos - {{ calendarDateToDate(selectedDate).toLocaleDateString("pt-BR") }}
        </h3>

        <div v-if="selectedDateEvents.length === 0" class="text-center py-8">
          <Icon name="i-tabler-calendar-x" size="48" class="mx-auto text-gray-400 mb-4" />
          <p class="text-gray-500">Nenhum agendamento para este dia</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="event in selectedDateEvents"
            :key="event.id"
            class="border border-l-4 rounded-lg p-4 space-y-4"
            :class="{
              'border-l-green-500': event.status === 'completed',
              'border-l-red-500': event.status === 'cancelled',
            }"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <UBadge :color="getStatusColor(event.status)" variant="subtle">
                  {{ statusLabels[event.status] || event.status }}
                </UBadge>
              </div>

              <span class="text-sm text-gray-500" v-if="event.time !== '00:00'">
                {{ event.time }}
              </span>
            </div>

            <div>
              <h4 class="font-semibold">{{ event.client.name }}</h4>
              <p class="text-sm text-muted flex items-center gap-1 mt-1" v-if="event.client.phone">
                <Icon name="i-tabler-phone" size="16" />
                {{ event.client.phone }}
              </p>
            </div>

            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pets:</p>
              <div class="flex flex-wrap gap-1">
                <UBadge v-for="pet in event.pets" :key="pet.id" variant="subtle">
                  {{ pet.name }}
                </UBadge>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <div class="flex gap-1 items-center">
                <span class="text-muted font-medium">Preço Base:</span>
                <span class="font-bold">
                  {{ formatCurrency(event.basePrice) }}
                </span>
              </div>

              <div class="flex gap-1 items-center">
                <span class="text-muted font-medium">Ajuste:</span>
                <span class="font-bold">
                  {{ formatCurrency(event.adjustmentValue) }}
                </span>
              </div>

              <div v-if="event.adjustmentReason">
                <span class="text-muted font-medium">Motivo Ajuste:</span>
                <span class="font-bold"> {{ event.adjustmentReason }} </span>
              </div>

              <div class="flex gap-1 items-center">
                <span class="text-muted font-medium">Preço Final:</span>
                <span class="font-bold text-green-500">
                  {{ formatCurrency(event.finalPrice) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
