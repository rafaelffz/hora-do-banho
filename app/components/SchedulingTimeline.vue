<script lang="ts" setup>
import type { SchedulingData, SchedulingGroup } from "~/types/scheduling"

interface Props {
  schedulings: SchedulingData[]
}

const props = defineProps<Props>()

// Agrupar agendamentos por data
const groupedSchedulings = computed(() => {
  const groups: Record<string, SchedulingData[]> = {}

  props.schedulings.forEach(item => {
    const date = new Date(item.scheduling.schedulingDate)
    const dateKey = date.toISOString().split("T")[0]

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(item)
  })

  // Ordenar grupos por data
  const sortedGroups = Object.entries(groups).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  )

  // Ordenar agendamentos dentro de cada grupo por horário
  return sortedGroups.map(([date, items]) => ({
    date,
    dateFormatted: new Date(date).toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    items: items.sort((a, b) => a.scheduling.schedulingDate - b.scheduling.schedulingDate),
  }))
})

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500 border-blue-200",
  confirmed: "bg-green-500 border-green-200",
  in_progress: "bg-yellow-500 border-yellow-200",
  completed: "bg-gray-500 border-gray-200",
  cancelled: "bg-red-500 border-red-200",
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
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
  <div class="space-y-8">
    <!-- Mensagem quando não há agendamentos -->
    <div v-if="groupedSchedulings.length === 0" class="text-center py-12">
      <Icon name="i-tabler-calendar-off" size="64" class="mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-semibold text-gray-600 mb-2">Nenhum agendamento encontrado</h3>
      <p class="text-gray-500">Não há agendamentos para os próximos 30 dias.</p>
    </div>

    <!-- Timeline de agendamentos -->
    <div v-else class="space-y-8">
      <div v-for="group in groupedSchedulings" :key="group.date" class="relative">
        <!-- Data do grupo -->
        <div class="flex items-center mb-6">
          <div class="shrink-0">
            <div
              class="w-4 h-4 bg-primary-500 rounded-full border-4 border-white shadow-lg z-10 relative"
            ></div>
          </div>
          <div class="ml-4">
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ capitalizeFirstLetter(group.dateFormatted) }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ group.items.length }}
              {{ group.items.length === 1 ? "agendamento" : "agendamentos" }}
            </p>
          </div>
        </div>

        <!-- Lista de agendamentos do dia -->
        <div class="ml-8 space-y-4">
          <div
            v-for="item in group.items"
            :key="item.scheduling.id"
            :class="[
              'relative bg-white dark:bg-gray-800 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow',
              statusColors[item.scheduling.status] || statusColors.scheduled,
            ]"
          >
            <div class="p-6">
              <!-- Header do card -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="shrink-0">
                    <Icon name="i-tabler-clock" size="20" class="text-gray-500" />
                  </div>
                  <div>
                    <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {{ formatTime(item.scheduling.schedulingDate) }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <div
                        :class="[
                          'w-2 h-2 rounded-full',
                          (statusColors[item.scheduling.status] || statusColors.scheduled).split(
                            ' '
                          )[0],
                        ]"
                      ></div>
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        {{ statusLabels[item.scheduling.status] || item.scheduling.status }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right">
                  <p class="text-xl font-bold text-green-600">
                    {{ formatCurrency(item.scheduling.totalPrice) }}
                  </p>
                </div>
              </div>

              <!-- Informações do cliente -->
              <div class="mb-4">
                <div class="flex items-center gap-2 mb-2">
                  <Icon name="i-tabler-user" size="18" class="text-gray-500" />
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ item.client.name }}
                  </h3>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Icon name="i-tabler-phone" size="16" />
                  <span>{{ item.client.phone }}</span>
                </div>
              </div>

              <!-- Pacote (se houver) -->
              <div v-if="item.package" class="mb-4">
                <div class="flex items-center gap-2 mb-1">
                  <Icon name="i-tabler-package" size="16" class="text-gray-500" />
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Pacote:</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 ml-6">
                  {{ item.package.name }}
                </p>
              </div>

              <!-- Pets -->
              <div class="mb-4">
                <div class="flex items-center gap-2 mb-2">
                  <Icon name="i-tabler-paw" size="16" class="text-gray-500" />
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ item.pets.length === 1 ? "Pet:" : "Pets:" }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2 ml-6">
                  <div
                    v-for="pet in item.pets"
                    :key="pet.id"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <Icon name="i-tabler-paw" size="14" class="mr-1" />
                    {{ pet.name }} ({{ getSizeLabel(pet.size) }})
                  </div>
                </div>
              </div>

              <!-- Observações (se houver) -->
              <div v-if="item.scheduling.notes" class="mb-4">
                <div class="flex items-center gap-2 mb-1">
                  <Icon name="i-tabler-note" size="16" class="text-gray-500" />
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Observações:</span
                  >
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 ml-6">
                  {{ item.scheduling.notes }}
                </p>
              </div>

              <!-- Ações -->
              <div
                class="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <UButton variant="ghost" size="sm" icon="i-tabler-edit"> Editar </UButton>
                <UButton
                  v-if="item.scheduling.status === 'scheduled'"
                  variant="soft"
                  size="sm"
                  color="success"
                  icon="i-tabler-check"
                >
                  Confirmar
                </UButton>
                <UButton
                  v-if="['scheduled', 'confirmed'].includes(item.scheduling.status)"
                  variant="soft"
                  size="sm"
                  color="error"
                  icon="i-tabler-x"
                >
                  Cancelar
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Linha conectora (exceto no último item) -->
        <div
          v-if="group !== groupedSchedulings[groupedSchedulings.length - 1]"
          class="absolute left-2 top-12 w-0.5 h-8 bg-gray-300 dark:bg-gray-600 -translate-x-1/2"
        ></div>
      </div>
    </div>
  </div>
</template>
