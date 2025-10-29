<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import { vMaska } from "maska/vue"
import { ZodError } from "zod/v4"
import {
  insertClientWithPetsSchema,
  insertPetSchema,
  petSizes,
  type InsertClientWithPets,
  type InsertPet,
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

const state = reactive<Partial<InsertClientWithPets>>({
  name: "",
  email: "",
  phone: "",
  address: "",
  packagePriceId: undefined,
  notes: "",
  pets: [],
})

const petState = reactive<Partial<InsertPet>>({
  name: "",
  size: "small",
  breed: "",
  weight: null,
  notes: "",
})

const isLoading = ref(false)
const isNewPetDialogOpen = ref(false)

async function onSubmit(event: FormSubmitEvent<InsertClientWithPets>) {
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

const openNewPetDialog = () => {
  isNewPetDialogOpen.value = true
}

async function onSubmitPetForm(event: FormSubmitEvent<InsertPet>) {
  isLoading.value = true
  state.pets = [...(state.pets || []), { ...event.data, id: "" }]
  isLoading.value = false

  isNewPetDialogOpen.value = false

  toast.add({
    title: "Pet cadastrado com sucesso!",
    description: `${event.data.name} foi adicionado à lista de pets do cliente.`,
    color: "success",
  })
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

      <UButton variant="subtle" color="secondary" class="cursor-pointer" @click="openNewPetDialog">
        <Icon name="i-tabler-paw" size="20" />
        Adicionar Pet
      </UButton>
    </div>

    <div class="size-full">
      <UCard class="w-full">
        <UForm
          :schema="insertClientWithPetsSchema"
          :state="state"
          class="space-y-5"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
            <UFormField label="Nome" name="name" class="md:col-span-4" required>
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

            <UFormField label="Telefone" name="phone" class="md:col-span-4">
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

            <UFormField label="Email" name="email" class="md:col-span-4">
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

            <UFormField label="Pacote" name="package" class="md:col-span-6">
              <USelectMenu
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="state.packagePriceId"
                value-key="id"
                description-key="recurrence"
                :items="
                  packagesList.map(pkg => ({
                    label: pkg.name,
                    id: pkg.id,
                    recurrence: pkg.recurrence
                      ? `Recorrência: A cada ${pkg.recurrence} dias`
                      : 'Sem recorrência',
                  })) || []
                "
                placeholder="Selecione o pacote"
                icon="i-tabler-package"
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
                :rows="5"
                :maxlength="500"
                :disabled="isLoading"
              />
            </UFormField>
          </div>

          <div>
            <h2 class="text-lg font-semibold mb-3">Pets Cadastrados</h2>

            <div v-if="state.pets && state.pets.length > 0" class="space-y-3 flex gap-6 flex-wrap">
              <div
                v-for="(pet, index) in state.pets"
                :key="index"
                class="p-4 border border-gray-200 border-t-4 border-t-primary rounded-lg w-full max-w-2xs text-wrap overflow-auto"
              >
                <h3 class="text-md font-medium">
                  {{ pet.name }}
                </h3>
                <p v-if="pet.breed" class="text-sm text-muted">Raça: {{ pet.breed }}</p>
                <p v-if="pet.size" class="text-sm text-muted">
                  Tamanho: {{ petSizes.find(size => size.value === pet.size)?.label || pet.size }}
                </p>
                <p v-if="pet.weight" class="text-sm text-muted">Peso: {{ pet.weight }} kg</p>
                <p v-if="pet.notes" class="text-sm text-muted">Observações: {{ pet.notes }}</p>
              </div>
            </div>

            <div v-else>
              <p class="text-sm text-muted">Nenhum pet cadastrado ainda.</p>
              <UButton
                variant="subtle"
                color="secondary"
                class="cursor-pointer mt-4"
                @click="openNewPetDialog"
              >
                <Icon name="i-tabler-paw" size="20" />
                Adicionar Pet
              </UButton>
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

    <UModal
      title="Adicionar Pet"
      v-model:open="isNewPetDialogOpen"
      :ui="{ footer: 'justify-end' }"
      class="max-w-2xl"
    >
      <template #body>
        <UForm
          :schema="insertPetSchema"
          :state="petState"
          class="space-y-5"
          @submit="onSubmitPetForm"
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
              />
            </UFormField>

            <UFormField label="Observações" name="notes" class="md:col-span-2">
              <UTextarea
                class="w-full"
                variant="subtle"
                size="xl"
                v-model="petState.notes"
                placeholder="Informações adicionais sobre o pet"
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
