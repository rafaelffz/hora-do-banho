<script lang="ts" setup>
const { user, clear } = useUserSession()

const route = useRoute()

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

const menuItems = ref([
  {
    title: "Agendamentos",
    icon: "i-tabler-calendar",
    route: "/dashboard/schedulings",
    active: route.path.includes("/dashboard/schedulings"),
  },
  {
    title: "Clientes",
    icon: "i-tabler-users",
    route: "/dashboard/clients",
    active: route.path.includes("/dashboard/clients"),
  },
  {
    title: "Pacotes",
    icon: "i-tabler-calendar-dollar",
    route: "/dashboard/packages",
    active: route.path.includes("/dashboard/packages"),
  },
])

watch(
  () => route.path,
  newPath => {
    menuItems.value.forEach(item => {
      item.active = newPath.includes(item.route)
    })
  }
)
</script>

<template>
  <div>
    <UDashboardNavbar :toggle="false">
      <template #left>
        <Logo />
      </template>

      <template #right>
        <div class="flex items-center gap-4">
          <UColorModeButton class="cursor-pointer" />

          <UDropdownMenu :items="dropdownItems">
            <UAvatar :src="user?.avatar" class="cursor-pointer" />
          </UDropdownMenu>
        </div>
      </template>
    </UDashboardNavbar>

    <div class="container mx-auto p-6 mb-24 font-Inter">
      <slot />
    </div>

    <div
      class="flex items-center justify-center gap-1 px-1 py-1 rounded-full bg-pink-400/95 w-fit fixed left-1/2 -translate-x-1/2 bottom-[5%]"
    >
      <NuxtLink
        v-for="item in menuItems"
        :key="item.title"
        :to="item.route"
        class="cursor-pointer text-white hover:text-gray-300 px-6 py-2 transition-all duration-200"
        :class="{ 'bg-pink-300/80 !text-pink-800 rounded-full': item.active }"
      >
        <UTooltip :text="item.title" :delay-duration="200">
          <Icon :name="item.icon" size="24" />
        </UTooltip>
      </NuxtLink>
    </div>
  </div>
</template>
