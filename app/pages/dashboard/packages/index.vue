<script lang="ts" setup>
import type { SelectPackage } from "~~/server/database/schema"

definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Pacotes",
})

const { packages, isLoading, error, refreshPackages, formatDuration, formatPrice, statistics } =
  usePackages()

const isConfirmDialogOpen = ref(false)
const confirmDialogState = reactive({
  title: "",
  description: "",
  onConfirm: async () => {},
})

const openToggleActiveDialog = (package_: SelectPackage) => {
  const action = package_.isActive ? "Desativar" : "Ativar"
  confirmDialogState.title = `${action} Pacote`
  confirmDialogState.description = `Você tem certeza que deseja ${action.toLowerCase()} o pacote "${
    package_.name
  }"?`

  confirmDialogState.onConfirm = async () => {
    await $fetch(`/api/packages/${package_.id}`, {
      method: "PATCH",
      body: { isActive: !package_.isActive },
    })

    const packageToUpdate = packages.value.find(p => p.id === package_.id)
    if (packageToUpdate) packageToUpdate.isActive = !packageToUpdate.isActive

    await refreshPackages()
  }

  isConfirmDialogOpen.value = true
}

const openDeleteDialog = (package_: SelectPackage) => {
  confirmDialogState.title = "Excluir Pacote"
  confirmDialogState.description = `Você tem certeza que deseja excluir o pacote "${package_.name}"? Esta ação não pode ser desfeita.`

  confirmDialogState.onConfirm = async () => {
    await $fetch(`/api/packages/${package_.id}`, { method: "DELETE" })
    packages.value = packages.value.filter(p => p.id !== package_.id)

    await refreshPackages()
  }

  isConfirmDialogOpen.value = true
}

const dropdownMenuPackageItems = (package_: SelectPackage) => [
  {
    label: "Ativar/Desativar",
    icon: "i-tabler-toggle-left",
    onSelect: () => openToggleActiveDialog(package_),
  },
  {
    label: "Excluir",
    icon: "i-tabler-trash",
    color: "error",
    to: "",
    onSelect: async () => openDeleteDialog(package_),
  },
]
</script>

<template>
  <div class="size-full flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon name="i-tabler-packages" size="24" />
        Pacotes
      </h1>

      <UButton
        to="/dashboard/packages/new"
        icon="i-tabler-plus"
        class="cursor-pointer text-white"
        v-if="packages?.length > 0"
      >
        Adicionar Pacote
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
          @click="refreshPackages"
        >
          Tentar novamente
        </UButton>
      </template>
    </UAlert>

    <div v-else class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatisticCard title="Total" :statistics="statistics.total" icon="i-tabler-packages" />
      <StatisticCard title="Ativos" :statistics="statistics.active" icon="i-tabler-box" />
      <StatisticCard title="Inativos" :statistics="statistics.inactive" icon="i-tabler-box-off" />
      <StatisticCard
        title="Preço Médio"
        :statistics="`R$ ${statistics.averagePrice}`"
        icon="i-tabler-coin"
      />
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <USkeleton class="h-32" v-for="i in 6" :key="i" />
    </div>

    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      v-if="!error && !isLoading && packages.length > 0"
    >
      <UCard
        variant="subtle"
        v-for="package_ in packages"
        :key="package_.id"
        :ui="{ body: 'sm:p-4', footer: 'p-2 sm:px-4' }"
      >
        <div class="flex items-start justify-between">
          <div class="flex flex-col gap-2 flex-1">
            <div class="flex items-center gap-2">
              <Icon name="i-tabler-package" size="20" class="text-primary" />
              <h3 class="font-semibold text-lg">{{ package_.name }}</h3>
              <UBadge
                :label="package_.isActive ? 'Ativo' : 'Inativo'"
                :color="package_.isActive ? 'success' : 'error'"
                variant="subtle"
                class="rounded-full"
              />
            </div>

            <p v-if="package_.description" class="text-sm text-gray-600 dark:text-gray-400">
              {{ package_.description }}
            </p>

            <div class="flex items-center gap-4 text-sm">
              <div class="flex items-center gap-1">
                <span class="font-medium">{{ formatPrice(package_.price) }}</span>
              </div>

              <div class="flex items-center gap-1">
                <Icon name="i-tabler-clock" size="16" />
                <span>{{ formatDuration(package_.duration) }}</span>
              </div>

              <div class="flex items-center gap-1">
                <Icon name="i-tabler-calendar-repeat" size="16" />
                <span>{{ package_.recurrence }} dias</span>
              </div>
            </div>
          </div>

          <div>
            <UDropdownMenu :items="dropdownMenuPackageItems(package_)">
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
            <UButton variant="ghost" :to="`/dashboard/packages/${package_.id}`" loading-auto>
              Ver detalhes
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <div
      v-else-if="!error && !isLoading && packages.length === 0"
      class="flex flex-col items-center justify-center text-gray-400 size-full"
    >
      <Icon name="i-tabler-package-off" size="48" />

      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum pacote encontrado</h3>

      <p class="text-gray-600 dark:text-gray-400 mb-2">Crie seu primeiro pacote para começar.</p>

      <UButton to="/dashboard/packages/new" icon="i-tabler-plus"> Criar primeiro pacote </UButton>
    </div>

    <ConfirmDialog
      v-model:open="isConfirmDialogOpen"
      :title="confirmDialogState.title"
      :description="confirmDialogState.description"
      @confirm="confirmDialogState.onConfirm"
    />
  </div>
</template>
