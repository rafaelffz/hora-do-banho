<script setup lang="ts">
import type { SelectClient } from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Clientes",
})

const { clients, isLoading, error, statistics, refreshClients } = useClients()

const isConfirmDialogOpen = ref(false)
const confirmDialogState = reactive({
  title: "",
  description: "",
  onConfirm: async () => {},
})

const openToggleActiveDialog = (client: SelectClient) => {
  const action = client.isActive ? "Desativar" : "Ativar"
  confirmDialogState.title = `${action} Cliente`
  confirmDialogState.description = `Você tem certeza que deseja ${action.toLowerCase()} o(a) cliente "${
    client.name
  }"?`

  confirmDialogState.onConfirm = async () => {
    console.log(`Toggling active status for client ${client.id}`)

    await $fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      body: { isActive: !client.isActive },
    })

    const clientToUpdate = clients.value.find(c => c.id === client.id)
    if (clientToUpdate) clientToUpdate.isActive = !clientToUpdate.isActive

    await refreshClients()
  }

  isConfirmDialogOpen.value = true
}

const openDeleteDialog = (client: SelectClient) => {
  confirmDialogState.title = "Excluir Cliente"
  confirmDialogState.description = `Você tem certeza que deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`

  confirmDialogState.onConfirm = async () => {
    await $fetch(`/api/clients/${client.id}`, { method: "DELETE" })
    clients.value = clients.value.filter(c => c.id !== client.id)

    await refreshClients()
  }

  isConfirmDialogOpen.value = true
}

const dropdownMenuClientItems = (client: SelectClient) => [
  {
    label: "Ativar/Desativar",
    icon: "i-tabler-user-check",
    onSelect: () => openToggleActiveDialog(client),
  },
  {
    label: "Excluir",
    icon: "i-tabler-trash",
    color: "error",
    to: "",
    onSelect: async () => openDeleteDialog(client),
  },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon name="i-tabler-users" size="24" />
        Clientes
      </h1>

      <UButton to="/dashboard/clients/new" icon="i-tabler-plus" class="cursor-pointer text-white">
        Adicionar Cliente
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      title="Erro ao carregar clientes"
      :description="error.message || 'Ocorreu um erro inesperado'"
      icon="i-tabler-alert-triangle"
      :ui="{
        icon: 'size-11',
      }"
    >
      <template #actions>
        <UButton
          size="xs"
          color="neutral"
          class="cursor-pointer"
          loading
          variant="solid"
          @click="refreshClients"
        >
          Tentar novamente
        </UButton>
      </template>
    </UAlert>

    <div v-else class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatisticCard title="Total" :statistics="statistics.total" icon="i-tabler-users" />
      <StatisticCard title="Ativos" :statistics="statistics.active" icon="i-tabler-user-check" />
      <StatisticCard title="Inativos" :statistics="statistics.inactive" icon="i-tabler-user-x" />
      <StatisticCard
        title="Novos"
        subtitle="Últimos 30 dias"
        :statistics="statistics.recent"
        icon="i-tabler-user-up"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" v-if="isLoading">
      <USkeleton class="h-32 w-full" v-for="n in 4" />
    </div>

    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      v-if="!error && !isLoading && clients.length > 0"
    >
      <UCard
        variant="subtle"
        v-for="client in clients"
        :key="client.id"
        :ui="{ body: 'sm:p-4', footer: 'p-2 sm:px-4' }"
      >
        <div class="flex items-start justify-between">
          <UUser
            :description="client.phone"
            :avatar="{
              icon: 'i-tabler-user-circle',
            }"
            size="xl"
          >
            <template #name>
              <span class="flex items-center gap-2">
                {{ client.name }}

                <UBadge
                  :label="client.isActive ? 'Ativo' : 'Inativo'"
                  :color="client.isActive ? 'success' : 'error'"
                  variant="subtle"
                  class="rounded-full"
                />
              </span>
            </template>
          </UUser>

          <div>
            <UDropdownMenu :items="dropdownMenuClientItems(client)">
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

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :to="`/dashboard/clients/${client.id}`" loading-auto>
              Ver detalhes
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <div v-if="!isLoading && !error && clients.length === 0" class="text-center py-32 text-muted">
      <Icon name="i-tabler-users-plus" size="48" class="mx-auto mb-2" />
      <p>Nenhum cliente cadastrado ainda.</p>
      <UButton variant="subtle" class="mt-4" to="/dashboard/clients/new">
        Cadastrar primeiro cliente
      </UButton>
    </div>

    <ConfirmDialog
      v-model:open="isConfirmDialogOpen"
      :title="confirmDialogState.title"
      :description="confirmDialogState.description"
      :onConfirm="confirmDialogState.onConfirm"
    />
  </div>
</template>
