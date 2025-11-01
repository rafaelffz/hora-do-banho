<script lang="ts" setup>
import type { SchedulingData, SchedulingEvent } from "~/types/scheduling"

interface Props {
  schedulings: SchedulingData[]
}

const props = defineProps<Props>()

const selectedDate = ref(new Date())
const currentMonth = ref(new Date())

// Converter agendamentos para eventos do calendário
const calendarEvents = computed(() => {
  return props.schedulings.map(
    item =>
      ({
        id: item.scheduling.id,
        title: `${item.client.name} - ${item.pets.map(p => p.name).join(", ")}`,
        date: new Date(item.scheduling.schedulingDate),
        time: new Date(item.scheduling.schedulingDate).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        client: {
          name: item.client.name,
          phone: item.client.phone,
        },
        pets: item.pets,
        status: item.scheduling.status,
        totalPrice: item.scheduling.totalPrice,
      }) as SchedulingEvent
  )
})

// Agrupar eventos por data
const eventsByDate = computed(() => {
  const grouped: Record<string, SchedulingEvent[]> = {}

  calendarEvents.value.forEach(event => {
    const dateKey = event.date.toISOString().split("T")[0]
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(event)
  })

  return grouped
})

// Eventos do dia selecionado
const selectedDateEvents = computed(() => {
  const dateKey = selectedDate.value.toISOString().split("T")[0]
  return eventsByDate.value[dateKey] || []
})

// Gerar dias do mês atual
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days = []
  const current = new Date(startDate)

  // Gerar 42 dias (6 semanas x 7 dias)
  for (let i = 0; i < 42; i++) {
    const dateKey = current.toISOString().split("T")[0]
    const eventsForDate = eventsByDate.value[dateKey]
    const hasEvents = eventsForDate ? eventsForDate.length > 0 : false

    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      isToday: current.toDateString() === new Date().toDateString(),
      isSelected: current.toDateString() === selectedDate.value.toDateString(),
      hasEvents,
      eventsCount: hasEvents ? eventsForDate?.length || 0 : 0,
    })

    current.setDate(current.getDate() + 1)
  }

  return days
})

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

const currentMonthName = computed(() => {
  return `${monthNames[currentMonth.value.getMonth()]} ${currentMonth.value.getFullYear()}`
})

const calendarStatusColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  in_progress: "bg-yellow-500",
  completed: "bg-gray-500",
  cancelled: "bg-red-500",
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

function selectDate(day: any) {
  selectedDate.value = day.date
}

function previousMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  )
}

function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  )
}

function goToToday() {
  const today = new Date()
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = today
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function getSizeLabel(size: string | null) {
  const sizeLabels: Record<string, string> = {
    small: "Pequeno",
    medium: "Médio",
    large: "Grande",
  }
  return size ? sizeLabels[size] || size : "N/A"
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Calendário -->
    <div class="flex-1">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <!-- Header do calendário -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">{{ currentMonthName }}</h2>
          <div class="flex items-center gap-2">
            <UButton variant="outline" size="sm" @click="goToToday"> Hoje </UButton>
            <UButton
              variant="ghost"
              size="sm"
              icon="i-tabler-chevron-left"
              @click="previousMonth"
            />
            <UButton variant="ghost" size="sm" icon="i-tabler-chevron-right" @click="nextMonth" />
          </div>
        </div>

        <!-- Dias da semana -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div
            v-for="day in weekDays"
            :key="day"
            class="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {{ day }}
          </div>
        </div>

        <!-- Dias do mês -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="day in calendarDays"
            :key="day.date.toISOString()"
            @click="selectDate(day)"
            :class="[
              'relative p-2 h-12 text-sm transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              {
                'text-gray-400 dark:text-gray-600': !day.isCurrentMonth,
                'text-gray-900 dark:text-gray-100': day.isCurrentMonth,
                'bg-primary-500 text-white': day.isSelected,
                'bg-primary-100 dark:bg-primary-900': day.isToday && !day.isSelected,
              },
            ]"
          >
            {{ day.date.getDate() }}

            <!-- Indicador de eventos -->
            <div v-if="day.hasEvents" class="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Lista de eventos do dia selecionado -->
    <div class="w-full lg:w-96">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 class="text-lg font-bold mb-4">
          Agendamentos - {{ selectedDate.toLocaleDateString("pt-BR") }}
        </h3>

        <div v-if="selectedDateEvents.length === 0" class="text-center py-8">
          <Icon name="i-tabler-calendar-x" size="48" class="mx-auto text-gray-400 mb-4" />
          <p class="text-gray-500">Nenhum agendamento para este dia</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="event in selectedDateEvents"
            :key="event.id"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <!-- Status e horário -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-3 h-3 rounded-full',
                    calendarStatusColors[event.status] || 'bg-gray-500',
                  ]"
                ></div>
                <span class="text-sm font-medium">
                  {{ statusLabels[event.status] || event.status }}
                </span>
              </div>
              <span class="text-sm text-gray-500">{{ event.time }}</span>
            </div>

            <!-- Cliente -->
            <h4 class="font-semibold mb-1">{{ event.client.name }}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {{ event.client.phone }}
            </p>

            <!-- Pets -->
            <div class="mb-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pets:</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="pet in event.pets"
                  :key="pet.id"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {{ pet.name }} ({{ getSizeLabel(pet.size) }})
                </span>
              </div>
            </div>

            <!-- Preço -->
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold text-green-600">
                {{ formatCurrency(event.totalPrice) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
