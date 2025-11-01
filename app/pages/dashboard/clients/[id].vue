<script lang="ts" setup>
import type { DropdownMenuItem, FormSubmitEvent } from "@nuxt/ui"
import { vMaska } from "maska/vue"
import { ZodError } from "zod/v4"
import type {
  ClientWithPetsAndSubscriptions,
  PetFormData,
  PetWithSubscription,
} from "~~/app/types/client"
import {
  insertPetWithSubscriptionsSchema,
  petSizes,
  updateClientSchema,
  type InsertPet,
  type UpdateClient,
} from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Cliente",
})

const route = useRoute()
const toast = useToast()
const { breeds } = usePets()
const { packagesList } = usePackages()
const { daysOfWeek, formatPrice, calculatePriceWithAdjustment, getDayOfWeekLabel } =
  useSubscriptions()

const { data: client, refresh } = await useFetch<ClientWithPetsAndSubscriptions>(
  `/api/clients/${route.params.id}`,
  {
    key: `client-${route.params.id}`,
  }
)

const isConfirmDialogOpen = ref(false)
const confirmDialogState = reactive({
  title: "",
  description: "",
  onConfirm: async () => {},
})

const initialClient = JSON.parse(JSON.stringify(client.value))
const isLoading = ref(false)
const isEditing = ref(false)
const isRegister = ref(false)
const isPetDialogOpen = ref(false)
const petSelected = ref<PetWithSubscription | null>(null)
const hasSubscription = ref(false)
const selectedPackagePrice = ref<any>(null)

const petState = reactive<PetFormData>({
  name: "",
  size: "small",
  breed: "",
  weight: null,
  notes: "",
  subscription: {
    id: "",
    packagePriceId: "",
    pickupDayOfWeek: 1,
    pickupTime: "",
    startDate: Date.now(),
    adjustmentPercentage: 0,
    adjustmentReason: "",
    notes: "",
    isActive: true,
  },
})

const priceCalculation = computed(() => {
  if (!selectedPackagePrice.value) {
    return {
      basePrice: 0,
      finalPrice: 0,
      formattedBasePrice: formatPrice(0),
      formattedFinalPrice: formatPrice(0),
    }
  }

  return calculatePriceWithAdjustment(
    selectedPackagePrice.value.price,
    petState.subscription.adjustmentPercentage
  )
})

watch(
  () => petState.subscription.packagePriceId,
  newPackageId => {
    selectedPackagePrice.value = packagesList.value?.find(pkg => pkg.id === newPackageId) || null
  }
)

async function onSubmit(event: FormSubmitEvent<UpdateClient>) {
  isLoading.value = true

  try {
    const clientData = {
      ...client.value,
      pets: client.value?.pets?.map(pet => ({
        id: pet.id || "",
        name: pet.name,
        breed: pet.breed || "",
        size: pet.size,
        weight: pet.weight,
        notes: pet.notes || "",
        subscription: pet.subscription
          ? {
              id: pet.subscription.id,
              packagePriceId: pet.subscription.packagePriceId,
              pickupDayOfWeek: pet.subscription.pickupDayOfWeek,
              pickupTime: pet.subscription.pickupTime || null,
              startDate: pet.subscription.startDate,
              adjustmentPercentage: pet.subscription.adjustmentPercentage || 0,
              adjustmentReason: pet.subscription.adjustmentReason || null,
              notes: pet.subscription.notes || null,
              isActive: pet.subscription.isActive !== false,
            }
          : null,
      })),
    }

    console.log(event.data)
    console.log(clientData)

    await $fetch(`/api/clients/${route.params.id}`, {
      method: "PUT",
      body: clientData,
    })

    toast.add({
      title: "Cliente atualizado com sucesso!",
      description: `${event.data.name} foi atualizado.`,
      color: "success",
    })

    isEditing.value = false
    await refresh()
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
        title: "Erro ao atualizar cliente",
        description: error?.data?.message || "Tente novamente em alguns instantes.",
        color: "error",
      })
    }
  } finally {
    isLoading.value = false
  }
}

const onSubmitPet = async (event: FormSubmitEvent<InsertPet>) => {
  if (!client.value) return

  isLoading.value = true

  try {
    if (isRegister.value) {
      const newPet: PetWithSubscription = {
        id: `temp_${Date.now()}`,
        name: event.data.name!,
        breed: event.data.breed || null,
        size: event.data.size || null,
        weight: event.data.weight || null,
        notes: event.data.notes || null,
        subscription: hasSubscription.value
          ? {
              packagePriceId: petState.subscription.packagePriceId,
              pickupDayOfWeek: petState.subscription.pickupDayOfWeek,
              pickupTime: petState.subscription.pickupTime || null,
              startDate: petState.subscription.startDate,
              adjustmentPercentage: petState.subscription.adjustmentPercentage,
              adjustmentReason: petState.subscription.adjustmentReason || null,
              finalPrice: priceCalculation.value.finalPrice,
              notes: petState.subscription.notes || null,
              isActive: true,
            }
          : null,
      }

      client.value?.pets.push(newPet)

      toast.add({
        title: "Pet adicionado com sucesso!",
        description: `${event.data.name} foi adicionado ao cliente.`,
        color: "success",
      })
    } else {
      const petToUpdateIndex =
        client.value?.pets.findIndex(pet => pet.id === petSelected.value?.id) ?? -1

      if (petToUpdateIndex !== -1 && client.value) {
        client.value.pets[petToUpdateIndex] = {
          ...client.value.pets[petToUpdateIndex],
          id: client.value.pets[petToUpdateIndex]?.id || "",
          name: event.data.name!,
          breed: event.data.breed || null,
          size: event.data.size || null,
          weight: event.data.weight || null,
          notes: event.data.notes || null,
          subscription: hasSubscription.value
            ? {
                id: petState.subscription.id || undefined,
                packagePriceId: petState.subscription.packagePriceId,
                pickupDayOfWeek: petState.subscription.pickupDayOfWeek,
                pickupTime: petState.subscription.pickupTime || null,
                startDate: petState.subscription.startDate,
                adjustmentPercentage: petState.subscription.adjustmentPercentage,
                adjustmentReason: petState.subscription.adjustmentReason || null,
                notes: petState.subscription.notes || null,
                finalPrice: priceCalculation.value.finalPrice,
                isActive: petState.subscription.isActive,
              }
            : null,
        }

        toast.add({
          title: "Pet atualizado com sucesso!",
          description: `${event.data.name} foi atualizado.`,
          color: "success",
        })
      }
    }

    resetPetState()
    isPetDialogOpen.value = false
  } catch (error) {
    toast.add({
      title: "Erro ao processar pet",
      description: "Tente novamente em alguns instantes.",
      color: "error",
    })
  } finally {
    isLoading.value = false
  }
}

const openDeleteDialog = (pet: PetWithSubscription) => {
  confirmDialogState.title = "Excluir Pet"
  confirmDialogState.description = `Você tem certeza que deseja excluir o pet "${pet.name}"? Esta ação não pode ser desfeita.`

  confirmDialogState.onConfirm = async () => {
    if (!client.value) return

    const clientPetsWithoutDeletedPet = client.value.pets.filter(p => p.id !== pet.id)
    client.value = { ...client.value, pets: clientPetsWithoutDeletedPet }

    toast.add({
      title: "Pet excluído com sucesso!",
      description: `${pet.name} foi removido do cliente.`,
      color: "success",
    })
  }

  isConfirmDialogOpen.value = true
}

const openEditPetDialog = (pet: PetWithSubscription) => {
  isRegister.value = false
  petSelected.value = pet

  Object.assign(petState, {
    name: pet.name || "",
    size: pet.size || "small",
    breed: pet.breed || "",
    weight: pet.weight || null,
    notes: pet.notes || "",
  })

  if (pet.subscription) {
    hasSubscription.value = true
    Object.assign(petState.subscription, {
      id: pet.subscription.id || "",
      packagePriceId: pet.subscription.packagePriceId || "",
      pickupDayOfWeek: pet.subscription.pickupDayOfWeek || 1,
      pickupTime: pet.subscription.pickupTime || "",
      startDate: pet.subscription.startDate || Date.now(),
      adjustmentPercentage: pet.subscription.adjustmentPercentage || 0,
      adjustmentReason: pet.subscription.adjustmentReason || "",
      notes: pet.subscription.notes || "",
      isActive: pet.subscription.isActive !== false,
    })
  } else {
    hasSubscription.value = false
    resetSubscriptionState()
  }

  isPetDialogOpen.value = true
}

const openNewPetDialog = () => {
  isRegister.value = true
  petSelected.value = null
  resetPetState()
  resetSubscriptionState()
  hasSubscription.value = false
  isPetDialogOpen.value = true
}

const resetPetState = () => {
  Object.assign(petState, {
    name: "",
    size: "small",
    breed: "",
    weight: null,
    notes: "",
  })
}

const resetSubscriptionState = () => {
  Object.assign(petState.subscription, {
    id: "",
    packagePriceId: "",
    pickupDayOfWeek: 1,
    pickupTime: "",
    startDate: Date.now(),
    adjustmentPercentage: 0,
    adjustmentReason: "",
    notes: "",
    isActive: true,
  })
  selectedPackagePrice.value = null
}

const dropdownMenuPetItems = (pet: PetWithSubscription): DropdownMenuItem[][] => [
  [
    {
      label: "Editar",
      icon: "i-tabler-edit",
      onSelect: () => openEditPetDialog(pet),
    },
    {
      label: "Excluir",
      icon: "i-tabler-trash",
      onSelect: () => openDeleteDialog(pet),
    },
  ],
]

const cancel = () => {
  if (client.value) {
    client.value = JSON.parse(JSON.stringify(initialClient))
  }
  isEditing.value = false
}

const formatStartDate = (timestamp: number) => {
  return new Date(timestamp).toISOString().split("T")[0]
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex justify-between items-end">
      <div class="flex flex-col items-start gap-6">
        <UButton
          to="/dashboard/clients"
          variant="ghost"
          icon="i-tabler-arrow-left"
          label="Voltar"
        />

        <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Icon name="i-tabler-user" size="24" />
          Detalhes do Cliente
        </h1>
      </div>

      <div>
        <UButton
          variant="outline"
          icon="i-tabler-edit"
          class="cursor-pointer"
          v-if="!isEditing"
          @click="isEditing = true"
        >
          Editar
        </UButton>
      </div>
    </div>

    <div class="size-full">
      <UCard class="w-full" v-if="client">
        <UForm
          :schema="updateClientSchema"
          :state="client as any"
          class="space-y-5"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
            <UFormField label="Nome" name="name" class="md:col-span-6" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.name"
                placeholder="Digite o nome completo"
                icon="i-tabler-user"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Telefone" name="phone" class="md:col-span-6">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.phone"
                v-maska="'(##) #####-####'"
                placeholder="(11) 99999-9999"
                icon="i-tabler-phone"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Email" name="email" class="md:col-span-6">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.email"
                type="email"
                placeholder="exemplo@email.com"
                icon="i-tabler-mail"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Endereço" name="address" class="md:col-span-6">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.address"
                placeholder="Rua, número, bairro, cidade"
                icon="i-tabler-map-pin"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Observações" name="notes" class="md:col-span-12">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.notes"
                placeholder="Informações adicionais sobre o cliente"
                :rows="3"
                :maxlength="500"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>
          </div>

          <div>
            <div class="flex items-end justify-between my-6">
              <h2 class="text-lg font-semibold">Pets do Cliente</h2>
              <UButton
                variant="subtle"
                color="secondary"
                class="cursor-pointer"
                @click="openNewPetDialog"
                v-if="isEditing"
              >
                <Icon name="i-tabler-paw" size="20" />
                Adicionar Pet
              </UButton>
            </div>

            <div class="space-y-4" v-if="client.pets && client.pets.length > 0">
              <div
                v-for="(pet, index) in client.pets"
                :key="index"
                class="p-4 border border-gray-200 border-t-4 border-t-primary rounded-lg"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h3 class="text-md font-medium mb-3">{{ pet.name }}</h3>

                    <div class="grid grid-cols-1 md:grid-cols-2">
                      <div>
                        <h4 class="font-medium text-sm text-muted mb-2">Informações do Pet</h4>
                        <div class="space-y-1 text-sm text-gray-600">
                          <p v-if="pet.breed">Raça: {{ pet.breed }}</p>
                          <p v-if="pet.size">
                            Tamanho:
                            {{ petSizes.find(size => size.value === pet.size)?.label || pet.size }}
                          </p>
                          <p v-if="pet.weight">Peso: {{ pet.weight }} kg</p>
                          <p v-if="pet.notes">Observações: {{ pet.notes }}</p>
                        </div>
                      </div>

                      <USeparator class="my-3" />

                      <ClientOnly v-if="pet.subscription">
                        <div>
                          <h4 class="font-medium text-sm text-primary mb-1">Pacote Ativo</h4>
                          <div class="space-y-1 text-sm text-gray-600">
                            <p>
                              Pacote:
                              {{
                                packagesList?.find(
                                  pkg => pkg.id === pet.subscription?.packagePriceId
                                )?.name || "N/A"
                              }}
                            </p>

                            <p>
                              Coleta:
                              {{ getDayOfWeekLabel(pet.subscription?.pickupDayOfWeek || 0) }}
                            </p>

                            <p v-if="pet.subscription.pickupTime">
                              Horário: {{ pet.subscription.pickupTime }}
                            </p>

                            <p>
                              Preço: {{ formatPrice(pet.subscription?.finalPrice || 0) }}
                              <span
                                v-if="
                                  pet.subscription.adjustmentPercentage !== 0 &&
                                  pet.subscription.adjustmentPercentage !== null
                                "
                                class="text-xs"
                              >
                                ({{ (pet.subscription?.adjustmentPercentage || 0) > 0 ? "+" : ""
                                }}{{ pet.subscription?.adjustmentPercentage || 0 }}%)
                              </span>
                            </p>

                            <p v-if="pet.subscription.nextPickupDate">
                              Próxima coleta:
                              {{
                                new Date(pet.subscription.nextPickupDate || 0).toLocaleDateString(
                                  "pt-BR"
                                )
                              }}
                            </p>
                            <p v-if="pet.subscription.notes">Obs: {{ pet.subscription.notes }}</p>
                          </div>
                        </div>
                      </ClientOnly>

                      <div v-else>
                        <p class="text-sm text-muted">Nenhum pacote ativo para este pet.</p>
                      </div>
                    </div>
                  </div>

                  <div v-if="isEditing">
                    <UDropdownMenu :items="dropdownMenuPetItems(pet)">
                      <UButton
                        icon="i-tabler-dots-vertical"
                        size="sm"
                        variant="ghost"
                        color="neutral"
                        class="cursor-pointer"
                      />
                    </UDropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-gray-500">Nenhum pet cadastrado ainda.</p>
          </div>

          <div class="flex justify-end gap-3 pt-4" v-if="isEditing">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="cancel"
            />

            <UButton
              type="submit"
              icon="i-tabler-check"
              class="text-white cursor-pointer"
              label="Salvar Cliente"
              :loading="isLoading"
            />
          </div>
        </UForm>
      </UCard>
    </div>

    <UModal
      :title="isRegister ? 'Adicionar Pet' : 'Editar Pet'"
      v-model:open="isPetDialogOpen"
      class="max-w-4xl"
    >
      <template #body>
        <UForm
          :schema="insertPetWithSubscriptionsSchema"
          :state="{ ...petState, subscription: hasSubscription ? petState.subscription : null }"
          @submit="onSubmitPet"
          class="space-y-5"
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

          <USeparator class="my-5" />

          <div>
            <div class="flex items-center gap-3 mb-4">
              <UCheckbox v-model="hasSubscription" label="Configurar pacote para este pet" />
            </div>

            <div v-if="hasSubscription" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="Pacote" required>
                  <USelectMenu
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription.packagePriceId"
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

                <UFormField label="Dia da Semana" required>
                  <USelectMenu
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription.pickupDayOfWeek"
                    value-key="value"
                    :items="daysOfWeek as any"
                    placeholder="Selecione o dia"
                    icon="i-tabler-calendar"
                    :disabled="isLoading"
                  />
                </UFormField>

                <UFormField label="Horário (opcional)">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription.pickupTime"
                    placeholder="14:30"
                    icon="i-tabler-clock"
                    :disabled="isLoading"
                    v-maska="'##:##'"
                  />
                </UFormField>

                <UFormField label="Data de Início" required>
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription.startDate"
                    type="date"
                    :value="formatStartDate(petState.subscription.startDate)"
                    @input="
                      petState.subscription.startDate = new Date($event.target.value).getTime()
                    "
                    icon="i-tabler-calendar-event"
                    :disabled="isLoading"
                  />
                </UFormField>

                <UFormField label="Ajuste de Preço (%)">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription.adjustmentPercentage"
                    type="number"
                    placeholder="0"
                    icon="i-tabler-percentage"
                    :disabled="isLoading"
                    step="0.1"
                    min="-100"
                    max="100"
                  />
                </UFormField>

                <UFormField label="Motivo do Ajuste">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="petState.subscription.adjustmentReason"
                    placeholder="Ex: Desconto fidelidade"
                    icon="i-tabler-note"
                    :disabled="isLoading"
                  />
                </UFormField>

                <UFormField label="Status" v-if="!isRegister" class="md:col-span-2">
                  <UCheckbox
                    v-model="petState.subscription.isActive"
                    label="Subscription ativa"
                    :disabled="isLoading"
                  />
                </UFormField>
              </div>

              <UFormField label="Observações da Subscription">
                <UTextarea
                  class="w-full"
                  variant="subtle"
                  size="xl"
                  v-model="petState.subscription.notes"
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
                    v-if="petState.subscription.adjustmentPercentage !== 0"
                    class="flex justify-between"
                  >
                    <span>Ajuste ({{ petState.subscription.adjustmentPercentage }}%):</span>
                    <span
                      :class="
                        petState.subscription.adjustmentPercentage &&
                        petState.subscription.adjustmentPercentage > 0
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
              color="neutral"
              variant="outline"
              label="Cancelar"
              @click="isPetDialogOpen = false"
              :disabled="isLoading"
              class="cursor-pointer"
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

    <ConfirmDialog
      v-model:open="isConfirmDialogOpen"
      :title="confirmDialogState.title"
      :description="confirmDialogState.description"
      :onConfirm="confirmDialogState.onConfirm"
    />
  </div>
</template>
