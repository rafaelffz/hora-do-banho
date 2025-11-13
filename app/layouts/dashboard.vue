<script lang="ts" setup>
const { user, clear } = useUserSession()

const route = useRoute()

const mainEl = useTemplateRef<HTMLElement>("mainEl")

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
    icon: "i-tabler-packages",
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

if (import.meta.client) {
  watch(route, () => {
    setTimeout(() => {
      mainEl.value?.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }, 100)
  })
}
</script>

<template>
  <div>
    <UDashboardNavbar :toggle="false" class="fixed top-0 left-0 right-0 z-50 bg-default h-16">
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

    <div
      ref="mainEl"
      class="container mx-auto p-6 font-Inter w-full min-h-full flex flex-col my-18 overflow-y-auto"
    >
      <slot />
    </div>

    <div
      class="flex items-center justify-around h-14 bg-pink-400/95 w-2/3 md:w-1/3 rounded-full mb-4 fixed left-1/2 -translate-x-1/2 p-1.5 z-50 bottom-0 border-t border-pink-300"
    >
      <NuxtLink
        v-for="item in menuItems"
        :key="item.title"
        :to="item.route"
        class="flex items-center justify-center cursor-pointer text-white hover:text-gray-300 size-full transition-all duration-200"
        :class="{ 'bg-pink-300/85 text-pink-800! rounded-full': item.active }"
      >
        <UTooltip :text="item.title" :delay-duration="200">
          <Icon :name="item.icon" size="26" />
        </UTooltip>
      </NuxtLink>
    </div>
  </div>
</template>
