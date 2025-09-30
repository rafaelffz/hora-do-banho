<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui"

definePageMeta({
  middleware: "auth",
})

const { user, clear } = useUserSession()

const activeTab = ref("appointments")

const tabItems = [
  {
    label: "Agendamentos",
    icon: "i-tabler-calendar",
    slot: "appointments" as const,
  },
  {
    label: "Clientes",
    icon: "i-tabler-users",
    slot: "customers" as const,
  },
  {
    label: "Pacotes",
    icon: "i-tabler-calendar-dollar",
    slot: "plans" as const,
  },
] satisfies TabsItem[]

const dropdownItems = ref([
  [
    {
      label: user.value?.name || "Anônimo",
      avatar: {
        src: user.value?.avatar || "Anônimo",
      },
      type: "label",
    },
  ],
  [
    {
      label: "Sair",
      icon: "i-lucide-log-out",
      onSelect: () => {
        clear()
        navigateTo("/")
      },
    },
  ],
])
</script>

<template>
  <UDashboardNavbar :toggle="false">
    <template #left>
      <Logo />
    </template>

    <template #right>
      <div class="flex items-center gap-4">
        <UColorModeButton />

        <UDropdownMenu :items="dropdownItems">
          <UAvatar :src="user?.avatar" />
        </UDropdownMenu>
      </div>
    </template>
  </UDashboardNavbar>

  <UTabs v-model="activeTab" :items="tabItems" variant="link" class="w-full">
    <template #appointments>
      <Appointments />
    </template>
  </UTabs>
</template>
