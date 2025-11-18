<script lang="ts" setup>
import type { SchedulingData } from "~/types/scheduling"
import { format, formatISO, parseISO } from "date-fns"

const props = defineProps<{
  schedulings: SchedulingData[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const showAdjustModal = ref(false)
const selectedScheduling = ref<SchedulingData | null>(null)
const adjustmentValue = ref(0)
const adjustmentReason = ref("")
const isLoading = ref(false)
const isAdjustment = ref(false)

const groupedSchedulings = computed(() => {
  const groups: Record<string, SchedulingData[]> = {}

  props.schedulings.forEach(item => {
    const date = formatISO(new Date(item.scheduling.pickupDate), { representation: "date" })

    if (!groups[date]) {
      groups[date] = []
    }

    groups[date].push(item)
  })

  const sortedGroups = Object.entries(groups).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  )

  return sortedGroups.map(([date, items]) => ({
    date,
    dateFormatted: parseISO(date).toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    items: items.sort((a, b) => a.scheduling.pickupDate - b.scheduling.pickupDate),
  }))
})

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const formatTime = (timestamp: number) => {
  if (timestamp === null) return "N/A"

  const timeString = new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return timeString === "00:00" ? "N/A" : timeString
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const getSizeLabel = (size: string | null) => {
  const sizeLabels: Record<string, string> = {
    small: "Pequeno",
    medium: "Médio",
    large: "Grande",
  }
  return size ? sizeLabels[size] || size : "N/A"
}

const openAdjustModal = (scheduling: SchedulingData, isAdjustmentParam: boolean) => {
  selectedScheduling.value = scheduling
  adjustmentValue.value = isAdjustmentParam ? 0 : scheduling.scheduling.adjustmentValue || 0
  adjustmentReason.value = isAdjustmentParam ? "" : scheduling.scheduling.adjustmentReason || ""
  showAdjustModal.value = true
  isAdjustment.value = isAdjustmentParam
}

const closeAdjustModal = () => {
  showAdjustModal.value = false
  selectedScheduling.value = null
  adjustmentValue.value = 0
  adjustmentReason.value = ""
}

const updateSchedulingStatus = async (
  schedulingId: string,
  status: string,
  adjustment?: { value: number; reason: string }
) => {
  isLoading.value = true
  try {
    const body: any = { status }

    if (adjustment) {
      body.adjustmentValue = adjustment.value
      body.adjustmentReason = adjustment.reason
    }

    await $fetch(`/api/schedulings/${schedulingId}`, {
      method: "PATCH",
      body,
    })

    const toast = useToast()
    toast.add({
      title: "Sucesso",
      description: `Agendamento ${status === "completed" ? "concluído" : "cancelado"} com sucesso!`,
      color: "success",
    })

    emit("refresh")
  } catch (error: any) {
    console.error("Erro ao atualizar agendamento:", error)
    const toast = useToast()
    toast.add({
      title: "Erro",
      description: error.data?.message || "Erro ao atualizar agendamento",
      color: "error",
    })
  } finally {
    isLoading.value = false
  }
}

const completeScheduling = (scheduling: SchedulingData) => {
  openAdjustModal(scheduling, true)
}

const openDetailsScheduling = (scheduling: SchedulingData) => {
  openAdjustModal(scheduling, false)
}

const cancelScheduling = async (scheduling: SchedulingData) => {
  const confirmed = confirm("Tem certeza que deseja cancelar este agendamento?")
  if (confirmed) {
    await updateSchedulingStatus(scheduling.scheduling.id, "cancelled")
  }
}

const confirmAdjustment = async () => {
  if (!selectedScheduling.value) return

  await updateSchedulingStatus(selectedScheduling.value.scheduling.id, "completed", {
    value: adjustmentValue.value,
    reason: adjustmentReason.value,
  })

  closeAdjustModal()
}

const adjustedTotal = computed(() => {
  if (!selectedScheduling.value) return 0
  return selectedScheduling.value.scheduling.finalPrice + adjustmentValue.value
})

const getStatusColor = (status: string) => {
  const statusColors: Record<
    string,
    "primary" | "success" | "warning" | "neutral" | "error" | "secondary" | "info"
  > = {
    scheduled: "neutral",
    completed: "success",
    cancelled: "error",
  }

  return statusColors[status] || "primary"
}
</script>

<template>
  <div class="space-y-8">
    <div v-if="groupedSchedulings.length === 0" class="text-center py-12">
      <Icon name="i-tabler-calendar-off" size="64" class="mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-semibold text-gray-600 mb-2">Nenhum agendamento encontrado</h3>
      <p class="text-gray-500">Não há agendamentos para os próximos 30 dias.</p>
    </div>

    <div v-else class="space-y-8">
      <div
        v-for="group in groupedSchedulings"
        :key="group.date"
        class="relative h-full pb-3 overflow-hidden"
      >
        <div class="shrink-0 absolute top-4">
          <div
            class="size-4 bg-secondary rounded-full border-4 border-muted dark:border-white shadow-lg z-10 relative"
          ></div>
        </div>

        <div
          class="absolute left-2 top-10 bottom-8 w-0.5 h-full bg-gray-300 dark:bg-gray-600 -translate-x-1/2"
        ></div>

        <div class="flex items-center mb-6 ml-4">
          <div class="ml-4">
            <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">
              {{ capitalizeFirstLetter(group.dateFormatted) }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ group.items.length }}
              {{ group.items.length === 1 ? "agendamento" : "agendamentos" }}
            </p>
          </div>
        </div>

        <div class="ml-8 space-y-4">
          <div
            v-for="item in group.items"
            :key="item.scheduling.id"
            class="rounded-lg border border-gray-600 border-l-4 shadow-xl"
            :class="{
              'border-l-green-500': item.scheduling.status === 'completed',
              'border-l-red-500': item.scheduling.status === 'cancelled',
            }"
          >
            <div class="p-4 w-full space-y-4">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="shrink-0" v-if="item.scheduling.pickupTime">
                    <Icon name="i-tabler-clock" size="20" class="text-gray-500" />
                  </div>

                  <div>
                    <p
                      class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                      v-if="item.scheduling.pickupTime"
                    >
                      {{ item.scheduling.pickupTime }}
                    </p>

                    <div class="flex items-center gap-2 mt-1">
                      <UBadge :color="getStatusColor(item.scheduling.status)" variant="subtle">
                        {{ statusLabels[item.scheduling.status] }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-2" v-if="item.client.name">
                  <Icon name="i-tabler-user" size="18" class="text-gray-500" />
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ item.client.name }}
                  </h3>
                </div>

                <div
                  class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                  v-if="item.client.phone"
                >
                  <Icon name="i-tabler-phone" size="16" />
                  <span>{{ item.client.phone }}</span>
                </div>
              </div>

              <div v-if="item.package">
                <div class="flex items-center gap-2 mb-1">
                  <Icon name="i-tabler-package" size="16" class="text-gray-500" />
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Pacote:</span>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400 ml-6">
                  {{ item.package.name }}
                </p>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-1">
                  <Icon name="i-tabler-paw" size="16" class="text-gray-500" />
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ item.pets.length === 1 ? "Pet:" : "Pets:" }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-2 ml-6">
                  <UBadge
                    v-for="pet in item.pets"
                    :key="pet.id"
                    icon="i-tabler-dog"
                    size="md"
                    color="primary"
                    variant="subtle"
                  >
                    {{ pet.name }}
                  </UBadge>
                </div>
              </div>

              <div v-if="item.scheduling.status === 'completed'">
                <UButton
                  variant="soft"
                  size="sm"
                  color="info"
                  block
                  icon="i-tabler-info-circle"
                  label="Detalhes"
                  :loading="isLoading"
                  class="cursor-pointer"
                  @click="openDetailsScheduling(item)"
                />
              </div>

              <div v-if="item.scheduling.notes">
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

              <div
                class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                v-if="item.scheduling.status === 'scheduled'"
              >
                <UButton
                  variant="soft"
                  size="sm"
                  color="success"
                  block
                  icon="i-tabler-check"
                  :loading="isLoading"
                  class="cursor-pointer"
                  @click="completeScheduling(item)"
                >
                  Concluir
                </UButton>
                <!-- <UButton
                  variant="soft"
                  size="sm"
                  block
                  color="error"
                  icon="i-tabler-x"
                  :loading="isLoading"
                  class="cursor-pointer"
                  @click="cancelScheduling(item)"
                >
                  Cancelar
                </UButton> -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal
      :title="isAdjustment ? 'Concluir Agendamento' : 'Detalhes do Agendamento'"
      v-model:open="showAdjustModal"
    >
      <template #body>
        <div>
          <div v-if="selectedScheduling" class="space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <div class="font-medium">
                  <span class="text-gray-300">Cliente:</span>
                  {{ selectedScheduling.client.name }}
                </div>

                <div class="text-sm text-muted" v-if="selectedScheduling.scheduling.pickupTime">
                  {{ selectedScheduling.scheduling.pickupTime }}
                </div>
              </div>

              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedScheduling.package?.name }}
              </div>

              <div class="flex flex-wrap gap-1 mt-2">
                <span class="text-gray-300">Pets:</span>
                <UBadge v-for="pet in selectedScheduling.pets" :key="pet.id" variant="soft">
                  {{ pet.name }}
                </UBadge>
              </div>
            </div>

            <USeparator />

            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium mb-1">Preço Base</label>
                <div class="text-lg font-semibold text-green-600">
                  {{ formatCurrency(selectedScheduling.scheduling.basePrice) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1"> Ajuste de Preço (opcional) </label>
                <UInput
                  v-model.number="adjustmentValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  icon="i-tabler-currency-real"
                  :readonly="!isAdjustment"
                />

                <p class="text-xs text-gray-500 mt-1">
                  Use valores negativos para desconto, positivos para acréscimo
                </p>
              </div>

              <div v-if="adjustmentValue !== 0">
                <label class="block text-sm font-medium mb-1"> Motivo do Ajuste </label>
                <UInput
                  v-model="adjustmentReason"
                  placeholder="Ex: Pet com muito embolo..."
                  :readonly="!isAdjustment"
                />
              </div>

              <div
                v-if="adjustmentValue !== 0"
                class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg"
              >
                <div class="flex justify-between items-center">
                  <span class="font-medium">Total Final:</span>
                  <span class="text-lg font-bold text-green-600">
                    {{ formatCurrency(adjustedTotal) }}
                  </span>
                </div>
                <div v-if="adjustmentValue !== 0" class="text-sm mt-1">
                  <span :class="adjustmentValue > 0 ? 'text-red-600' : 'text-green-600'">
                    {{ adjustmentValue > 0 ? "+" : "" }}{{ formatCurrency(adjustmentValue) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-3">
              <UButton
                color="neutral"
                class="cursor-pointer"
                variant="soft"
                block
                @click="closeAdjustModal"
                :disabled="isLoading"
              >
                {{ isAdjustment ? "Cancelar" : "Fechar" }}
              </UButton>

              <UButton
                color="success"
                class="cursor-pointer"
                block
                icon="i-tabler-check"
                :loading="isLoading"
                @click="confirmAdjustment"
                v-if="isAdjustment"
              >
                Concluir
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
