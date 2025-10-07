<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Clientes",
})
</script>

<template>
  <div>Clientes</div>
</template>
