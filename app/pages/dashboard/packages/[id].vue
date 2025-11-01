<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import { ZodError } from "zod/v4"
import {
  updatePackageWithPricesSchema,
  type UpdatePackagePrice,
  type UpdatePackageWithPrices,
} from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Pacote",
})

const route = useRoute()
const toast = useToast()
const { durationOptions } = usePackages()

const { data: package_ } = await useFetch<UpdatePackageWithPrices>(
  `/api/packages/${route.params.id}`,
  {
    key: `package-${route.params.id}`,
  }
)

const isLoading = ref(false)
const isEditing = ref(false)

const packagePriceToRemove = ref<UpdatePackagePrice | null>(null)
const isConfirmDialogOpen = ref(false)
const confirmDialogState = reactive({
  title: "",
  description: "",
  onConfirm: async () => {},
})

const state = reactive<UpdatePackageWithPrices>({
  name: package_.value?.name || "",
  description: package_.value?.description || "",
  duration: package_.value?.duration || 60,
  isActive: package_.value?.isActive ?? true,
  pricesByRecurrence: [],
})

const pricesByRecurrence = ref<UpdatePackagePrice[]>(package_.value?.pricesByRecurrence || [])

watch(
  package_,
  newPackage => {
    if (newPackage) {
      state.name = newPackage.name
      state.description = newPackage.description || ""
      state.duration = newPackage.duration
      state.isActive = newPackage.isActive ?? true
      pricesByRecurrence.value = newPackage.pricesByRecurrence || []
    }
  },
  { immediate: true }
)

const addPriceOption = () => {
  pricesByRecurrence.value.push({ recurrence: 7, price: 140 })
}

const removePriceOption = (index: number) => {
  if (pricesByRecurrence.value.length > 1) {
    const itemToRemove = pricesByRecurrence.value[index]
    if (!itemToRemove) return

    console.log(itemToRemove)
    openDeleteDialog(itemToRemove)
  }
}

const openDeleteDialog = (packagePrice: UpdatePackagePrice) => {
  confirmDialogState.title = "Excluir Preço do Pacote"
  confirmDialogState.description = `
    Você tem certeza que deseja excluir o valor R$ ${packagePrice.price} com recorrência de ${packagePrice.recurrence} dias?
    Esta ação não pode ser desfeita.
    `

  confirmDialogState.onConfirm = async () => {
    if (packagePrice.id) {
      await $fetch(`/api/package-prices/${packagePrice.id}`, { method: "DELETE" })
    }

    pricesByRecurrence.value = pricesByRecurrence.value.filter(
      (price: UpdatePackagePrice) => price.id !== packagePrice.id
    )

    toast.add({
      title: `Preço de R$ ${packagePrice.price} do pacote excluído`,
      description: `O preço com recorrência de ${packagePrice.recurrence} dias foi excluído.`,
      color: "success",
    })

    isConfirmDialogOpen.value = false
  }

  isConfirmDialogOpen.value = true
}

const onSubmit = async (event: FormSubmitEvent<UpdatePackageWithPrices>) => {
  isLoading.value = true

  console.log(event.data)

  try {
    await $fetch(`/api/packages/${route.params.id}`, {
      method: "PATCH",
      body: { ...event.data, pricesByRecurrence: pricesByRecurrence.value },
    })

    toast.add({
      title: "Pacote atualizado com sucesso!",
      description: `${event.data.name} foi atualizado.`,
      color: "success",
    })

    isEditing.value = false
    await navigateTo("/dashboard/packages")
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
        title: "Erro ao atualizar pacote",
        description: "Tente novamente em alguns instantes.",
        color: "error",
      })
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex justify-between items-end">
      <div class="flex flex-col items-start gap-6">
        <UButton
          to="/dashboard/packages"
          variant="ghost"
          icon="i-tabler-arrow-left"
          label="Voltar"
        />

        <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Icon name="i-tabler-package" size="24" />
          Detalhes do Pacote
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
      <UCard class="w-full" v-if="package_">
        <UForm
          :schema="updatePackageWithPricesSchema"
          :state="state"
          class="space-y-5"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField label="Nome" name="name" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.name"
                placeholder="Digite o nome do pacote"
                icon="i-tabler-package"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Duração" name="duration" required>
              <UInputMenu
                class="w-full"
                variant="subtle"
                size="xl"
                value-key="value"
                v-model="state.duration"
                placeholder="Digite a duração do pacote"
                :items="durationOptions"
                icon="i-tabler-clock"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Descrição" name="description" class="md:col-span-2">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.description"
                placeholder="Descrição do pacote (detalhes do que está incluso, etc)."
                :rows="4"
                :maxlength="500"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>
          </div>

          <div class="space-y-4">
            <div class="flex center justify-between">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <Icon name="i-tabler-currency-dollar" size="20" />
                Preços por Recorrência
              </h3>

              <UButton
                v-if="isEditing"
                type="button"
                variant="outline"
                size="sm"
                icon="i-tabler-plus"
                label="Adicionar"
                class="cursor-pointer"
                @click="addPriceOption"
                :disabled="isLoading"
              />
            </div>

            <div class="space-y-5">
              <div
                v-for="(priceOption, index) in pricesByRecurrence"
                :key="index"
                class="relative grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700"
              >
                <div
                  class="absolute -top-2 -left-2 flex items-center justify-center w-6 h-6 bg-primary text-white font-bold text-xs rounded-full z-10"
                >
                  {{ index + 1 }}
                </div>

                <UFormField label="Intervalo de dias">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model.number="priceOption.recurrence"
                    placeholder="Selecione a recorrência"
                    icon="i-tabler-calendar-repeat"
                    :disabled="isLoading || !isEditing"
                  />
                </UFormField>

                <UFormField label="Preço">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model="priceOption.price"
                    type="number"
                    icon="i-tabler-currency-dollar"
                    :disabled="isLoading || !isEditing"
                  />
                </UFormField>

                <div class="flex items-end justify-end">
                  <UButton
                    type="button"
                    variant="ghost"
                    color="error"
                    size="lg"
                    class="cursor-pointer"
                    icon="i-tabler-trash"
                    :disabled="pricesByRecurrence.length <= 1 || isLoading || !isEditing"
                    @click="removePriceOption(index)"
                  />
                </div>
              </div>
            </div>

            <UAlert
              icon="i-tabler-info-circle"
              color="info"
              variant="soft"
              title="Dica"
              description="Defina preços diferentes para cada recorrência. Normalmente, quanto menor o intervalo (mais frequente), maior o preço total."
            />
          </div>

          <div class="flex justify-end gap-3 pt-4" v-if="isEditing">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="isEditing = false"
            />

            <UButton
              type="submit"
              icon="i-tabler-check"
              class="text-white cursor-pointer"
              label="Salvar Pacote"
              :loading="isLoading"
            />
          </div>
        </UForm>
      </UCard>
    </div>

    <ConfirmDialog
      v-model:open="isConfirmDialogOpen"
      :title="confirmDialogState.title"
      :description="confirmDialogState.description"
      :onConfirm="confirmDialogState.onConfirm"
    />
  </div>
</template>
