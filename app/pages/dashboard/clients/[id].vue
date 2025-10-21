<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui"
import { ZodError } from "zod/v4"
import { vMaska } from "maska/vue"
import {
  insertPetSchema,
  petSizes,
  updateClientSchema,
  type InsertPet,
  type SelectPet,
  type UpdateClient,
  type UpdatePet,
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

const { data: client } = await useFetch(`/api/clients/${route.params.id}`, {
  key: `client-${route.params.id}`,
})

const initialClient = JSON.parse(JSON.stringify(client.value))
const isLoading = ref(false)
const isEditing = ref(false)
const isRegister = ref(false)
const isPetDialogOpen = ref(false)
const petSelected = ref<SelectPet | null>(null)
const petState = reactive<Partial<UpdatePet>>({
  name: "",
  size: "small",
  breed: "",
  weight: null,
  notes: "",
})

async function onSubmit(event: FormSubmitEvent<UpdateClient>) {
  isLoading.value = true

  try {
    const clientData = {
      ...client.value,
      pets: client.value?.pets?.map(pet => ({
        id: pet.id || "",
        name: pet.name,
        breed: pet.breed,
        size: pet.size,
        weight: pet.weight,
        notes: pet.notes,
      })),
    }

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

const onSubmitPet = async (event: FormSubmitEvent<InsertPet>) => {
  if (!client.value) return

  isLoading.value = true

  try {
    if (isRegister.value) {
      const newPet = {
        ...event.data,
      } as SelectPet

      client.value.pets.push(newPet)

      toast.add({
        title: "Pet adicionado com sucesso!",
        description: `${event.data.name} foi adicionado ao cliente.`,
        color: "success",
      })
    } else {
      const petToUpdateIndex = client.value.pets.findIndex(pet => pet.id === petSelected.value?.id)

      if (petToUpdateIndex !== -1) {
        client.value.pets[petToUpdateIndex] = {
          ...(client.value.pets[petToUpdateIndex] as SelectPet),
          ...event.data,
        }

        toast.add({
          title: "Pet atualizado com sucesso!",
          description: `${event.data.name} foi atualizado.`,
          color: "success",
        })
      }
    }

    Object.assign(petState, {
      name: "",
      size: "small",
      breed: "",
      weight: null,
      notes: "",
    })

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

const openEditPetDialog = (pet: SelectPet) => {
  isRegister.value = false
  petSelected.value = pet

  Object.assign(petState, {
    name: pet.name || "",
    size: pet.size || "small",
    breed: pet.breed || "",
    weight: pet.weight || null,
    notes: pet.notes || "",
  })

  isPetDialogOpen.value = true
}

const openNewPetDialog = () => {
  isRegister.value = true
  petSelected.value = null

  Object.assign(petState, {
    name: "",
    size: "small",
    breed: "",
    weight: null,
    notes: "",
  })

  isPetDialogOpen.value = true
}

const dropdownMenuPetItems = (pet: SelectPet) => [
  {
    label: "Editar",
    icon: "i-tabler-edit",
    onSelect: () => openEditPetDialog(pet),
  },
  {
    label: "Excluir",
    icon: "i-tabler-trash",
    color: "error",
    to: "",
  },
]

const cancelar = () => {
  if (client.value) {
    client.value = JSON.parse(JSON.stringify(initialClient))
  }

  isEditing.value = false
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
                :disabled="isLoading || !isEditing"
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
                :disabled="isLoading || !isEditing"
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
                :disabled="isLoading || !isEditing"
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
                :disabled="isLoading || !isEditing"
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
                :disabled="isLoading || !isEditing"
              />
            </UFormField>
          </div>

          <div>
            <div class="flex items-end justify-between my-9">
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

            <div
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              v-if="client.pets && client.pets.length > 0"
            >
              <div
                v-for="(pet, index) in client.pets"
                :key="index"
                class="px-3 py-2 border border-gray-200 border-t-4 border-t-primary rounded-lg w-full text-wrap overflow-auto flex justify-between items-start"
              >
                <div>
                  <h3 class="text-md font-medium mb-2">
                    {{ pet.name }}
                  </h3>
                  <p v-if="pet.breed" class="text-sm text-muted">Raça: {{ pet.breed }}</p>
                  <p v-if="pet.size" class="text-sm text-muted">
                    Tamanho:
                    {{ petSizes.find(size => size.value === pet.size)?.label || pet.size }}
                  </p>
                  <p v-if="pet.weight" class="text-sm text-muted">Peso: {{ pet.weight }} kg</p>
                  <p v-if="pet.notes" class="text-sm text-muted">Observações: {{ pet.notes }}</p>
                </div>
                <div v-if="isEditing">
                  <UDropdownMenu :items="dropdownMenuPetItems(pet as SelectPet)">
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

            <p v-else class="text-sm text-gray-500">Nenhum pet cadastrado ainda.</p>
          </div>

          <div class="flex justify-end gap-3 pt-4" v-if="isEditing">
            <UButton
              type="button"
              variant="ghost"
              label="Cancelar"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="cancelar"
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
      :ui="{ footer: 'justify-end' }"
      class="max-w-2xl"
    >
      <template #body>
        <UForm :schema="insertPetSchema" :state="petState" @submit="onSubmitPet" class="space-y-5">
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
  </div>
</template>
