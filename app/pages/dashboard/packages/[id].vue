<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import { ZodError } from "zod/v4"
import { updatePackageSchema, type UpdatePackage } from "~~/server/database/schema"

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

const { data: package_ } = await useFetch(`/api/packages/${route.params.id}`, {
  key: `package-${route.params.id}`,
})

const isLoading = ref(false)
const isEditing = ref(false)

async function onSubmit(event: FormSubmitEvent<UpdatePackage>) {
  isLoading.value = true

  try {
    await $fetch(`/api/packages/${route.params.id}`, {
      method: "PATCH",
      body: { ...event.data, id: route.params.id },
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
        <UForm :schema="updatePackageSchema" :state="package_" class="space-y-5" @submit="onSubmit">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <UFormField label="Nome" name="name" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="package_.name"
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
                v-model="package_.duration"
                placeholder="Digite a duração do pacote"
                :items="durationOptions"
                icon="i-tabler-clock"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Preço" name="price" required>
              <UInputNumber
                v-model="package_.price"
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
                :disabled="isLoading || !isEditing"
              />
            </UFormField>

            <UFormField label="Descrição" name="description" class="md:col-span-3">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="package_.description"
                placeholder="Descrição do pacote (detalhes do que está incluso, etc)."
                :rows="3"
                :maxlength="500"
                :disabled="isLoading || !isEditing"
              />
            </UFormField>
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
  </div>
</template>
