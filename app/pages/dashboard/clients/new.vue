<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import z4, { ZodError } from "zod/v4"
import { vMaska } from "maska/vue"
import { insertClientSchema, type InsertClient } from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Cadastrar Cliente",
})

const toast = useToast()

const state = reactive<Partial<InsertClient>>({
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
})

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<InsertClient>) {
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
        <Icon name="i-tabler-user-plus" size="24" />
        Cadastrar Cliente
      </h1>

      <UButton to="/dashboard/clients" variant="ghost" icon="i-tabler-arrow-left" label="Voltar" />
    </div>

    <div class="flex justify-center">
      <UCard class="w-full max-w-7xl">
        <UForm :schema="insertClientSchema" :state="state" class="space-y-5" @submit="onSubmit">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField label="Nome" name="name" required>
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

            <UFormField label="Telefone" name="phone">
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

            <UFormField label="Email" name="email">
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

            <UFormField label="Endereço" name="address" required>
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

            <UFormField label="Observações" name="notes" class="md:col-span-2">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.notes"
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
              label="Cadastrar Cliente"
              :loading="isLoading"
            />
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>
