<script lang="ts" setup>
definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Pacotes",
})
</script>

<template>
  <div>Pacotes</div>
</template>
