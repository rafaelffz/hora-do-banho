<script lang="ts" setup>
definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Agendamentos",
})

const posts = ref([
  {
    title: "Nuxt Icon v1",
    description: "Discover Nuxt Icon v1!",
    image:
      "https://images.pexels.com/photos/220938/pexels-photo-220938.jpeg?_gl=1*errrqv*_ga*MTg5NDYzNTE0OC4xNzU5ODQ1NTA0*_ga_8JE65Q40S6*czE3NTk4NDU1MDQkbzEkZzEkdDE3NTk4NDU1MjIkajQyJGwwJGgw",
    date: "2024-11-25",
  },
  {
    title: "Nuxt 3.14",
    description: "Nuxt 3.14 is out!",
    image:
      "https://images.pexels.com/photos/220938/pexels-photo-220938.jpeg?_gl=1*errrqv*_ga*MTg5NDYzNTE0OC4xNzU5ODQ1NTA0*_ga_8JE65Q40S6*czE3NTk4NDU1MDQkbzEkZzEkdDE3NTk4NDU1MjIkajQyJGwwJGgw",
    date: "2024-11-04",
  },
  {
    title: "Nuxt 3.13",
    description: "Nuxt 3.13 is out!",
    image:
      "https://images.pexels.com/photos/220938/pexels-photo-220938.jpeg?_gl=1*errrqv*_ga*MTg5NDYzNTE0OC4xNzU5ODQ1NTA0*_ga_8JE65Q40S6*czE3NTk4NDU1MDQkbzEkZzEkdDE3NTk4NDU1MjIkajQyJGwwJGgw",
    date: "2024-08-22",
  },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between">
      <h1 class="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Icon name="i-tabler-calendar" size="24" />
        Agendamentos
      </h1>

      <UButton class="cursor-pointer text-white">Adicionar Agendamento</UButton>
    </div>

    <div class="flex flex-col">
      <div>
        <h2 class="text-lg md:text-xl font-semibold flex items-center gap-2">7 Out. 2025</h2>
      </div>

      <div class="flex flex-row gap-3 mt-2">
        <div class="w-[2px] bg-gray-800 rounded-full min-h-[380px]"></div>

        <div>
          <UBlogPosts>
            <UBlogPost v-for="(post, index) in posts" :key="index" v-bind="post" />
          </UBlogPosts>
        </div>
      </div>
    </div>
  </div>
</template>
