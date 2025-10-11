<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import { ZodError } from "zod/v4"
import { vMaska } from "maska/vue"
import { updateClientSchema, type UpdateClient } from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Cliente",
})

const route = useRoute()
const toast = useToast()

const { data: client } = await useFetch(`/api/clients/${route.params.id}`, {
  key: `client-${route.params.id}`,
})

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<UpdateClient>) {
  isLoading.value = true

  try {
    await $fetch(`/api/clients/${route.params.id}`, {
      method: "PATCH",
      body: { ...event.data, id: route.params.id },
    })

    toast.add({
      title: "Cliente atualizado com sucesso!",
      description: `${event.data.name} foi atualizado.`,
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
        title: "Erro ao atualizar cliente",
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
    <div class="flex items-center justify-between">
      <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon name="i-tabler-user" size="24" />
        Detalhes do Cliente
      </h1>

      <UButton to="/dashboard/clients" variant="ghost" icon="i-tabler-arrow-left" label="Voltar" />
    </div>

    <div class="flex justify-center">
      <UCard class="w-full max-w-7xl" v-if="client">
        <UForm :schema="updateClientSchema" :state="client" class="space-y-5" @submit="onSubmit">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField label="Nome" name="name" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.name"
                placeholder="Digite o nome completo"
                icon="i-tabler-user"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Telefone" name="phone">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.phone"
                v-maska="'(##) #####-####'"
                placeholder="(11) 99999-9999"
                icon="i-tabler-phone"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Email" name="email">
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.email"
                type="email"
                placeholder="exemplo@email.com"
                icon="i-tabler-mail"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Endereço" name="address" required>
              <UInput
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.address"
                placeholder="Rua, número, bairro, cidade"
                icon="i-tabler-map-pin"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField label="Observações" name="notes" class="md:col-span-2">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="client.notes"
                placeholder="Informações adicionais sobre o cliente"
                :rows="5"
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
              @click="navigateTo('/dashboard/clients')"
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
  </div>
</template>
