<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import z4, { ZodError } from "zod/v4"
import { insertPackageSchema, type InsertPackage } from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Adicionar Pacote",
})

const toast = useToast()
const { durationOptions } = usePackages()

const state = reactive<Partial<InsertPackage>>({
  name: "",
  description: "",
  price: 0,
  duration: 60,
})

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<InsertPackage>) {
  isLoading.value = true

  try {
    await $fetch("/api/packages", {
      method: "POST",
      body: event.data,
    })

    toast.add({
      title: "Pacote criado com sucesso!",
      description: `${event.data.name} foi adicionado à sua lista de pacotes.`,
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

watch(
  () => state.price,
  newPrice => {
    if (newPrice === undefined) {
      state.price = 0
    }
  }
)
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
        <UForm :schema="insertPackageSchema" :state="state" class="space-y-5" @submit="onSubmit">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <UFormField label="Nome" name="name" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.name"
                placeholder="Digite o nome do pacote"
                icon="i-tabler-package"
                :disabled="isLoading"
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
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Preço" name="price" required>
              <UInputNumber
                v-model="state.price"
                size="xl"
                class="w-full"
                variant="subtle"
                locale="pt-BR"
                :step-snapping="false"
                :format-options="{
                  style: 'currency',
                  currency: 'BRL',
                  currencySign: 'accounting',
                }"
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

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="navigateTo('/dashboard/packages')"
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
