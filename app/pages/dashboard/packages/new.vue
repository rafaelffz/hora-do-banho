<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import { ZodError } from "zod/v4"
import {
  type InsertPackageWithPrices,
  type InsertPackagePrice,
  insertPackageWithPricesSchema,
} from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Adicionar Pacote",
})

const toast = useToast()

const state = reactive<Partial<InsertPackageWithPrices>>({
  name: "",
  description: "",
  duration: 60,
  pricesByRecurrence: [],
})

const pricesByRecurrence = ref<InsertPackagePrice[]>([{ recurrence: 7, price: 140 }])

const isLoading = ref(false)

const addPriceOption = () => {
  pricesByRecurrence.value.push({ recurrence: 7, price: 140 })
}

const removePriceOption = (index: number) => {
  if (pricesByRecurrence.value.length > 1) {
    pricesByRecurrence.value.splice(index, 1)
  }
}

const onSubmit = async (event: FormSubmitEvent<InsertPackageWithPrices>) => {
  isLoading.value = true

  try {
    const validPrices = pricesByRecurrence.value.filter(p => p.price > 0)
    if (validPrices.length === 0) {
      toast.add({
        title: "Erro de validação",
        description: "É necessário definir pelo menos um preço para o pacote.",
        color: "error",
      })
      return
    }

    const packageResult = await $fetch("/api/packages", {
      method: "POST",
      body: { ...event.data, pricesByRecurrence: validPrices },
    })

    toast.add({
      title: "Pacote criado com sucesso!",
      description: `${packageResult.name} foi adicionado com ${
        packageResult.pricesByRecurrence.length
      } ${packageResult.pricesByRecurrence.length === 1 ? "opção" : "opções"} de preço.`,
      color: "success",
    })

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
        title: "Erro interno",
        description: "Não foi possível criar o pacote. Tente novamente.",
        color: "error",
      })
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="size-full flex flex-col gap-6">
    <div class="flex flex-col items-start gap-6">
      <UButton to="/dashboard/packages" variant="ghost" icon="i-tabler-arrow-left" label="Voltar" />

      <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon name="i-tabler-package" size="24" />
        Adicionar Pacote
      </h1>
    </div>

    <div class="size-full">
      <UCard class="w-full">
        <UForm
          :schema="insertPackageWithPricesSchema"
          :state="state"
          class="space-y-6"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField label="Nome" name="name" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.name"
                placeholder="Ex: Banho + Tosa Completa"
                icon="i-tabler-package"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Duração (minutos)" name="duration" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.duration"
                placeholder="Digite a duração do pacote"
                icon="i-tabler-clock"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Descrição" name="description" class="md:col-span-3">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.description"
                placeholder="Descrição do pacote (detalhes do que está incluso, etc)."
                :rows="3"
                :maxlength="500"
                :disabled="isLoading"
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

            <div class="space-y-3">
              <div
                v-for="(priceOption, index) in pricesByRecurrence"
                :key="index"
                class="relative grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700"
              >
                <div
                  class="absolute -top-2 -left-2 flex items-center justify-center w-6 h-6 bg-primary text-white font-bold text-xs rounded-full z-10"
                >
                  {{ index + 1 }}
                </div>

                <UFormField label="Intervalo de dias" class="col-span-2">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model.number="priceOption.recurrence"
                    placeholder="Selecione a recorrência"
                    icon="i-tabler-calendar-repeat"
                    :disabled="isLoading"
                  />
                </UFormField>

                <UFormField label="Preço Mensal" class="col-span-2">
                  <UInput
                    class="w-full"
                    variant="subtle"
                    size="xl"
                    v-model.number="priceOption.price"
                    type="number"
                    icon="i-tabler-currency-real"
                    :disabled="isLoading"
                  />
                </UFormField>

                <div class="flex items-end justify-end col-span-1">
                  <UButton
                    type="button"
                    variant="ghost"
                    color="error"
                    size="lg"
                    class="cursor-pointer"
                    icon="i-tabler-trash"
                    :disabled="pricesByRecurrence.length <= 1 || isLoading"
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
              description="Defina preços diferentes para cada recorrência. Normalmente, quanto menor o intervalo (mais frequente), maior o preço mensal."
            />
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              to="/dashboard/packages"
            />

            <UButton
              type="submit"
              icon="i-tabler-check"
              class="text-white cursor-pointer"
              label="Adicionar Pacote"
              :loading="isLoading"
            />
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>
