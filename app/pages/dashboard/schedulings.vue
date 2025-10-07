<script lang="ts" setup>
definePageMeta({
  middleware: "auth",
  layout: "dashboard",
})

useHead({
  titleTemplate: "%s • Agendamentos",
})
</script>

<template>
  <div>Agendamentos</div>
</template>
