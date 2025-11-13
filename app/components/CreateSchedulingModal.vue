<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from "#ui/types"
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date"
import { vMaska } from "maska/vue"

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  pets: Array<{
    id: string
    name: string
    breed: string | null
    size: "small" | "medium" | "large" | null
  }>
}

interface FormData {
  clientId: string
  petIds: string[]
  pickupDate: number
  pickupTime: string
  basePrice: number
  finalPrice: number
  notes: string
}

const isOpen = defineModel<boolean>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { createScheduling } = useSchedulings()
const clients = ref<Client[]>([])

const isLoading = ref(false)

const formData = ref<FormData>({
  clientId: "",
  petIds: [],
  pickupDate: Date.now(),
  pickupTime: "",
  basePrice: 0,
  finalPrice: 0,
  notes: "",
})

const selectedClient = computed(() => {
  if (!clients.value || !formData.value.clientId) return null
  return clients.value.find(c => c.id === formData.value.clientId)
})

const availablePets = computed(() => {
  return selectedClient.value?.pets || []
})

watch(isOpen, async newValue => {
  if (newValue) {
    const { data } = await useFetch<Client[]>("/api/clients/list", { query: { withPets: true } })
    clients.value = data.value || []
  } else {
    formData.value = {
      clientId: "",
      petIds: [],
      pickupDate: Date.now(),
      pickupTime: "",
      basePrice: 0,
      finalPrice: 0,
      notes: "",
    }
  }
})

watch(
  () => formData.value.basePrice,
  newBasePrice => {
    if (newBasePrice >= 0) {
      formData.value.finalPrice = newBasePrice
    }
  }
)

watch(
  () => formData.value.clientId,
  () => {
    formData.value.petIds = []
  }
)

const df = new DateFormatter("pt-BR", {
  dateStyle: "medium",
})

const calendarDate = computed({
  get() {
    if (formData.value.pickupDate) {
      const date = new Date(formData.value.pickupDate)
      return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
    }
    return new CalendarDate(2025, 1, 1)
  },
  set(value) {
    if (value) {
      const newDate = value.toDate(getLocalTimeZone())
      formData.value.pickupDate = newDate.getTime()
    }
  },
})

const validate = (state: FormData): FormError[] => {
  const errors = []

  if (!state.clientId) {
    errors.push({ path: "clientId", message: "Selecione um cliente" })
  }

  if (state.petIds.length === 0) {
    errors.push({ path: "petIds", message: "Selecione pelo menos um pet" })
  }

  if (!state.pickupDate) {
    errors.push({ path: "pickupDate", message: "Selecione uma data" })
  }

  if (state.basePrice <= 0) {
    errors.push({ path: "basePrice", message: "O preço deve ser maior que zero" })
  }

  if (state.finalPrice < 0) {
    errors.push({ path: "finalPrice", message: "O preço final não pode ser negativo" })
  }

  return errors
}

const onSubmit = async (event: FormSubmitEvent<FormData>) => {
  isLoading.value = true

  try {
    const dateTime = new Date(event.data.pickupDate)

    if (event.data.pickupTime) {
      const timeParts = event.data.pickupTime.split(":")
      if (timeParts.length >= 2) {
        const hours = timeParts[0]
        const minutes = timeParts[1]
        if (hours && minutes) {
          dateTime.setHours(parseInt(hours), parseInt(minutes))
        }
      }
    }

    await createScheduling({
      clientId: event.data.clientId,
      petIds: event.data.petIds,
      pickupDate: dateTime.getTime(),
      pickupTime: event.data.pickupTime || null,
      basePrice: event.data.basePrice,
      finalPrice: event.data.finalPrice,
      adjustmentValue: event.data.finalPrice - event.data.basePrice,
      adjustmentPercentage:
        event.data.basePrice > 0
          ? ((event.data.finalPrice - event.data.basePrice) / event.data.basePrice) * 100
          : 0,
      adjustmentReason: event.data.finalPrice !== event.data.basePrice ? "Ajuste manual" : null,
      notes: event.data.notes || null,
    })

    emit("success")
    emit("close")
  } catch (error) {
    console.error("Erro ao criar agendamento:", error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  formData.value.pickupDate = tomorrow.getTime()
  formData.value.pickupTime = "09:00"
})
</script>

<template>
  <UModal title="Criar Agendamento Avulso" v-model:open="isOpen" class="max-w-4xl">
    <template #body>
      <UForm :validate="validate" :state="formData" @submit="onSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UFormField label="Cliente" name="clientId" required>
            <USelectMenu
              v-model="formData.clientId"
              :items="clients"
              value-key="id"
              label-key="name"
              placeholder="Selecione um cliente"
              searchable
              searchable-placeholder="Buscar cliente..."
              class="w-full"
              variant="subtle"
              size="xl"
            />
          </UFormField>

          <UFormField label="Pets" name="petIds" required :disabled="!selectedClient">
            <USelectMenu
              v-model="formData.petIds"
              :items="availablePets"
              value-key="id"
              label-key="name"
              placeholder="Selecione os pets"
              multiple
              searchable
              searchable-placeholder="Buscar pets..."
              class="w-full"
              variant="subtle"
              size="xl"
            />
          </UFormField>

          <UFormField label="Data" name="pickupDate" required>
            <UPopover class="w-full">
              <UButton
                color="neutral"
                variant="subtle"
                size="xl"
                icon="i-lucide-calendar"
                class="text-muted w-full justify-start"
              >
                {{
                  calendarDate
                    ? df.format(calendarDate.toDate(getLocalTimeZone()))
                    : "Selecione uma Data"
                }}
              </UButton>

              <template #content>
                <UCalendar v-model="calendarDate" class="p-2" size="lg" />
              </template>
            </UPopover>
          </UFormField>

          <UFormField label="Horário específico (opcional)" name="pickupTime">
            <UInput
              v-model="formData.pickupTime"
              placeholder="14:30"
              class="w-full"
              variant="subtle"
              size="xl"
              icon="i-tabler-clock"
              v-maska="'##:##'"
            />
          </UFormField>

          <UFormField label="Preço Base (R$)" name="basePrice" required>
            <UInput
              v-model.number="formData.basePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              class="w-full"
              variant="subtle"
              size="xl"
            />
          </UFormField>

          <UFormField label="Preço Final (R$)" name="finalPrice" required>
            <UInput
              v-model.number="formData.finalPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              class="w-full"
              variant="subtle"
              size="xl"
            />
          </UFormField>

          <UFormField label="Observações" name="notes" class="md:col-span-2">
            <UTextarea
              v-model="formData.notes"
              placeholder="Observações adicionais sobre o agendamento..."
              :rows="3"
              class="w-full"
              variant="subtle"
              size="xl"
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UButton color="neutral" variant="outline" @click="$emit('close')" :disabled="isLoading">
            Cancelar
          </UButton>

          <UButton type="submit" :loading="isLoading" :disabled="isLoading" class="text-white">
            Criar Agendamento
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
