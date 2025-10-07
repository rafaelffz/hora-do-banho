<script setup lang="ts">
const props = defineProps<{
  color: "white" | "black"
}>()
</script>

<template>
  <div class="flex items-center gap-3">
    <img src="@/assets/images/icon.svg" alt="Logo Hora do Banho" class="size-10 select-none" />
    <p
      class="font-Poppins text-lg md:text-xl font-semibold select-none dark:text-white text-gray-800"
      :class="{
        '!text-white': props.color === 'white',
        '!text-gray-800': props.color === 'black',
      }"
    >
      Hora do Banho
    </p>
  </div>
</template>
