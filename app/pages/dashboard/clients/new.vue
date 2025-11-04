<script lang="ts" setup>
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  type DateValue,
} from "@internationalized/date"
import type { FormSubmitEvent } from "@nuxt/ui"
import { vMaska } from "maska/vue"
import { ZodError } from "zod/v4"
import {
  insertClientWithPetsAndSubscriptionsSchema,
  insertPetWithSubscriptionsSchema,
  petSizes,
  type InsertClientWithPetsAndSubscriptions,
  type InsertPet,
  type InsertPetWithSubscriptions,
} from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Cadastrar Cliente",
})

const toast = useToast()
const { breeds } = usePets()
const { packagesList } = usePackages()
const { daysOfWeek, formatPrice, calculatePriceWithAdjustment } = useSubscriptions()

const state = reactive<Partial<InsertClientWithPetsAndSubscriptions>>({
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  pets: [],
})

const petState = reactive<Partial<InsertPet & { subscription?: any }>>({
  name: "",
  size: "small",
  breed: "",
  weight: null,
  notes: "",
  subscription: null,
})

const df = new DateFormatter("pt-BR", {
  dateStyle: "medium",
})

const calendarDate = computed({
  get() {
    if (petState.subscription?.startDate) {
      const date = new Date(petState.subscription.startDate)
      return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
    }

    return new CalendarDate(2025, 1, 1)
  },
  set(value) {
    if (petState.subscription && value) {
      const newDate = value.toDate(getLocalTimeZone())

      petState.subscription.startDate = newDate.getTime()
    }
  },
})

const isDateDisabled = (date: DateValue) => {
  if (!petState.subscription || petState.subscription.pickupDayOfWeek === undefined) {
    return false
  }

  const jsDate = date.toDate(getLocalTimeZone())
  const dayOfWeek = jsDate.getDay()

  return dayOfWeek !== petState.subscription.pickupDayOfWeek
}

const isLoading = ref(false)
const isNewPetDialogOpen = ref(false)
const hasSubscription = ref(false)

watch(hasSubscription, newValue => {
  if (newValue && !petState.subscription) {
    petState.subscription = {
      packagePriceId: "",
      pickupDayOfWeek: 1,
      pickupTime: null,
      startDate: Date.now(),
      adjustmentPercentage: 0,
      adjustmentReason: null,
      notes: null,
    }
  } else if (!newValue) {
    petState.subscription = null
  }
})

watch(
  () => petState.subscription?.pickupDayOfWeek,
  newDayOfWeek => {
    if (newDayOfWeek !== undefined && petState.subscription) {
      const today = new Date()
      const todayDayOfWeek = today.getDay()

      let daysToAdd = newDayOfWeek - todayDayOfWeek

      if (daysToAdd <= 0) {
        daysToAdd += 7
      }

      const nextDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysToAdd)

      petState.subscription.startDate = nextDate.getTime()
    }
  }
)

const selectedPackagePrice = ref<any>(null)

const priceCalculation = computed(() => {
  if (!selectedPackagePrice.value || !petState.subscription) {
    return {
      basePrice: 0,
      finalPrice: 0,
      formattedBasePrice: formatPrice(0),
      formattedFinalPrice: formatPrice(0),
    }
  }

  return calculatePriceWithAdjustment(
    selectedPackagePrice.value.price,
    petState.subscription?.adjustmentPercentage || 0
  )
})

watch(
  () => petState.subscription?.packagePriceId,
  newPackageId => {
    selectedPackagePrice.value = packagesList.value?.find(pkg => pkg.id === newPackageId) || null
  }
)

async function onSubmit(event: FormSubmitEvent<InsertClientWithPetsAndSubscriptions>) {
  isLoading.value = true

  try {
    await $fetch("/api/clients", {
      method: "POST",
      body: event.data,
    })

    toast.add({
      title: "Cliente cadastrado com sucesso!",
      description: `${event.data.name} foi adicionado à sua lista de clientes.`,
      color: "success",
    })

    await navigateTo("/dashboard/clients")
  } catch (error: any) {
    if (error instanceof ZodError && error.issues) {
      const issues = error.issues
      toast.add({
        title: "Erro de validação",
        description: issues.map((issue: any) => issue.message).join(", "),
        color: "error",
      })
    } else {
      toast.add({
        title: "Erro ao cadastrar cliente",
        description: error?.data?.message || "Tente novamente em alguns instantes.",
        color: "error",
      })
    }
  } finally {
    isLoading.value = false
  }
}

const openNewPetDialog = () => {
  Object.assign(petState, {
    name: "",
    size: "small",
    breed: "",
    weight: null,
    notes: "",
    subscription: null,
  })

  hasSubscription.value = false
  selectedPackagePrice.value = null
  isNewPetDialogOpen.value = true
}

async function onSubmitPetForm(event: FormSubmitEvent<InsertPetWithSubscriptions>) {
  isLoading.value = true

  const petData = {
    ...event.data,
    id: "",
    subscription:
      hasSubscription.value && petState.subscription
        ? {
            packagePriceId: petState.subscription.packagePriceId,
            pickupDayOfWeek: petState.subscription.pickupDayOfWeek,
            pickupTime:
              petState.subscription.pickupTime && petState.subscription.pickupTime.trim() !== ""
                ? petState.subscription.pickupTime
                : null,
            startDate: new Date(petState.subscription.startDate).getTime(),
            adjustmentPercentage: petState.subscription.adjustmentPercentage,
            adjustmentReason:
              petState.subscription.adjustmentReason &&
              petState.subscription.adjustmentReason.trim() !== ""
                ? petState.subscription.adjustmentReason
                : null,
            notes:
              petState.subscription.notes && petState.subscription.notes.trim() !== ""
                ? petState.subscription.notes
                : null,
          }
        : null,
  }

  state.pets = [...(state.pets || []), petData]
  isLoading.value = false

  isNewPetDialogOpen.value = false

  toast.add({
    title: "Pet cadastrado com sucesso!",
    description: `${event.data.name} foi adicionado à lista de pets do cliente.`,
    color: "success",
  })
}

const removePet = (index: number) => {
  if (state.pets) {
    state.pets.splice(index, 1)
  }
}

const formatStartDate = (timestamp: number) => {
  return new Date(timestamp).toISOString().split("T")[0]
}
</script>

<template>
  <div class="size-full flex flex-col gap-6">
    <div class="flex justify-between items-end">
      <div class="flex flex-col items-start gap-6">
        <UButton
          to="/dashboard/clients"
          variant="ghost"
          icon="i-tabler-arrow-left"
          label="Voltar"
        />

        <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Icon name="i-tabler-user-plus" size="24" />
          Adicionar Cliente
        </h1>
      </div>
    </div>

    <div class="size-full">
      <UCard class="w-full">
        <UForm
          :schema="insertClientWithPetsAndSubscriptionsSchema"
          :state="state"
          class="space-y-5"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
            <UFormField label="Nome" name="name" class="md:col-span-6" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.name"
                placeholder="Digite o nome completo"
                icon="i-tabler-user"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Telefone" name="phone" class="md:col-span-6">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.phone"
                v-maska="'(##) #####-####'"
                placeholder="(11) 99999-9999"
                icon="i-tabler-phone"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Email" name="email" class="md:col-span-6">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.email"
                type="email"
                placeholder="exemplo@email.com"
                icon="i-tabler-mail"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Endereço" name="address" class="md:col-span-6">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.address"
                placeholder="Rua, número, bairro, cidade"
                icon="i-tabler-map-pin"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Observações" name="notes" class="md:col-span-12">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.notes"
                placeholder="Informações adicionais sobre o cliente"
                :rows="3"
                :maxlength="500"
                :disabled="isLoading"
              />
            </UFormField>
          </div>

          <div>
            <div class="flex items-center justify-between my-6">
              <h2 class="text-lg font-semibold">Pets Cadastrados</h2>

              <UButton
                variant="subtle"
                color="secondary"
                label="Adicionar Pet"
                leading-icon="i-tabler-paw"
                class="cursor-pointer"
                @click="openNewPetDialog"
              />
            </div>

            <div v-if="state.pets && state.pets.length > 0" class="space-y-3">
              <div
                v-for="(pet, index) in state.pets"
                :key="index"
                class="p-4 border border-gray-200 border-t-4 border-t-primary rounded-lg"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h3 class="text-md font-medium mb-2">{{ pet.name }}</h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted">
                      <div>
                        <p v-if="pet.breed">Raça: {{ pet.breed }}</p>
                        <p v-if="pet.size">
                          Tamanho:
                          {{ petSizes.find(size => size.value === pet.size)?.label || pet.size }}
                        </p>
                        <p v-if="pet.weight">Peso: {{ pet.weight }} kg</p>
                        <p v-if="pet.notes">Observações: {{ pet.notes }}</p>
                      </div>

                      <div v-if="pet.subscription">
                        <p class="font-medium text-primary mb-1">Subscription Ativa:</p>
                        <p>
                          Pacote:
                          {{
                            packagesList?.find(pkg => pkg.id === pet.subscription?.packagePriceId)
                              ?.name
                          }}
                        </p>
                        <p>
                          Coleta:
                          {{
                            daysOfWeek.find(day => day.value === pet.subscription?.pickupDayOfWeek)
                              ?.label
                          }}
                        </p>
                        <p v-if="pet.subscription?.pickupTime">
                          Horário: {{ pet.subscription.pickupTime }}
                        </p>
                        <p>
                          Preço:
                          {{
                            formatPrice(
                              packagesList?.find(pkg => pkg.id === pet.subscription?.packagePriceId)
                                ?.price || 0
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <UButton
                    icon="i-tabler-trash"
                    size="sm"
                    variant="ghost"
                    color="error"
                    class="cursor-pointer"
                    @click="removePet(index)"
                  />
                </div>
              </div>
            </div>

            <div v-else>
              <p class="text-sm text-muted">Nenhum pet cadastrado ainda.</p>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="navigateTo('/dashboard/clients')"
            />

            <UButton
              type="submit"
              icon="i-tabler-check"
              class="text-white cursor-pointer"
              label="Adicionar Cliente"
              :loading="isLoading"
            />
          </div>
        </UForm>
      </UCard>
    </div>

    <UModal title="Adicionar Pet" v-model:open="isNewPetDialogOpen" class="max-w-4xl">
      <template #body>
        <UForm
          :schema="insertPetWithSubscriptionsSchema"
          :state="{
            ...petState,
            subscription:
              hasSubscription && petState.subscription
                ? {
                    ...petState.subscription,
                    startDate: new Date(petState.subscription.startDate).getTime(),
                  }
                : null,
          }"
          class="space-y-5"
          @submit="onSubmitPetForm"
          @error="error => console.error('Form validation error:', error)"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField label="Nome" name="name" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="petState.name"
                placeholder="Digite o nome completo"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Tamanho" name="size" required>
              <USelectMenu
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="petState.size"
                value-key="value"
                :items="petSizes"
                placeholder="Selecione o tamanho"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Raça" name="breed">
              <UInputMenu
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="petState.breed"
                value-key="label"
                placeholder="Selecione a raça"
                :items="breeds?.map(breed => ({ label: breed.name, value: breed.id })) || []"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Peso (em kg)" name="weight">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="petState.weight"
                placeholder="Digite o peso"
                :disabled="isLoading"
                type="number"
                step="0.1"
              />
            </UFormField>

            <UFormField label="Observações do Pet" name="notes" class="md:col-span-2">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="petState.notes"
                placeholder="Informações adicionais sobre o pet"
                :rows="3"
                :maxlength="500"
                :disabled="isLoading"
              />
            </UFormField>
          </div>

          <div class="border-t pt-5">
            <div class="flex items-center gap-3 mb-4">
              <UCheckbox v-model="hasSubscription" label="Configurar pacote para este pet" />
            </div>

            <div v-if="hasSubscription" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField
                  label="Pacote"
                  name="subscription.packagePriceId"
                  required
                  :error="
                    hasSubscription && !petState.subscription?.packagePriceId
                      ? 'Pacote é obrigatório'
                      : undefined
                  "
                >
                  <USelectMenu
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription!.packagePriceId"
                    value-key="id"
                    :items="
                      packagesList?.map(pkg => ({
                        label: `${pkg.name} - ${formatPrice(pkg.price || 0)}`,
                        id: pkg.id,
                        description: pkg.recurrence
                          ? `Recorrência: A cada ${pkg.recurrence} dias`
                          : 'Sem recorrência',
                      })) || []
                    "
                    placeholder="Selecione o pacote"
                    icon="i-tabler-package"
                    :disabled="isLoading"
                  />
                </UFormField>

                <UFormField label="Dia da Semana" name="subscription.pickupDayOfWeek" required>
                  <USelectMenu
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription!.pickupDayOfWeek"
                    value-key="value"
                    :items="daysOfWeek as any"
                    placeholder="Selecione o dia"
                    icon="i-tabler-calendar"
                    :disabled="isLoading"
                  />
                </UFormField>

                <UFormField label="Horário (opcional)" name="subscription.pickupTime">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription!.pickupTime"
                    placeholder="14:30"
                    icon="i-tabler-clock"
                    :disabled="isLoading"
                    v-maska="'##:##'"
                  />
                </UFormField>

                <UFormField label="Data de Início" name="subscription.startDate" required>
                  <UPopover class="w-full">
                    <UButton
                      color="neutral"
                      variant="subtle"
                      size="xl"
                      icon="i-lucide-calendar"
                      class="text-muted"
                    >
                      {{
                        calendarDate
                          ? df.format(calendarDate.toDate(getLocalTimeZone()))
                          : "Selecione uma Data"
                      }}
                    </UButton>

                    <template #content>
                      <UCalendar
                        v-model="calendarDate"
                        :is-date-disabled="isDateDisabled"
                        class="p-2"
                        size="lg"
                      />
                    </template>
                  </UPopover>
                </UFormField>

                <UFormField label="Ajuste de Preço (%)" name="subscription.adjustmentPercentage">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription!.adjustmentPercentage"
                    type="number"
                    placeholder="0"
                    icon="i-tabler-percentage"
                    :disabled="isLoading"
                    step="0.1"
                    min="-100"
                    max="100"
                  />
                </UFormField>

                <UFormField label="Motivo do Ajuste" name="subscription.adjustmentReason">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription!.adjustmentReason"
                    placeholder="Ex: Desconto fidelidade"
                    icon="i-tabler-note"
                    :disabled="isLoading"
                  />
                </UFormField>
              </div>

              <UFormField label="Observações da Subscription" name="subscription.notes">
                <UTextarea
                  class="w-full"
                  variant="subtle"
                  size="xl"
                  v-model="petState.subscription!.notes"
                  placeholder="Informações adicionais sobre a subscription"
                  :rows="2"
                  :maxlength="500"
                  :disabled="isLoading"
                />
              </UFormField>

              <div v-if="selectedPackagePrice" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 class="font-medium mb-2">Resumo do Preço:</h4>

                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span>Preço Base:</span>
                    <span>{{ priceCalculation.formattedBasePrice }}</span>
                  </div>

                  <div
                    v-if="petState.subscription!.adjustmentPercentage !== 0"
                    class="flex justify-between"
                  >
                    <span>Ajuste ({{ petState.subscription!.adjustmentPercentage }}%):</span>
                    <span
                      :class="
                        petState.subscription!.adjustmentPercentage > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      "
                    >
                      {{
                        "formattedAdjustmentValue" in priceCalculation
                          ? priceCalculation.formattedAdjustmentValue
                          : formatPrice(0)
                      }}
                    </span>
                  </div>

                  <div class="flex justify-between font-medium pt-2 border-t">
                    <span>Preço Final:</span>
                    <span>{{ priceCalculation.formattedFinalPrice }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="isNewPetDialogOpen = false"
            />

            <UButton
              type="submit"
              label="Confirmar"
              icon="i-tabler-check"
              :loading="isLoading"
              class="text-white cursor-pointer"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
