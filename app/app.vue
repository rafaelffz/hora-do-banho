<script setup lang="ts">
import { pt_br } from "@nuxt/ui/locale"
import type { ToasterProps } from "@nuxt/ui"

const toaster = { position: "top-left" } as ToasterProps
</script>

<template>
  <UApp :locale="pt_br" :toaster="toaster">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
