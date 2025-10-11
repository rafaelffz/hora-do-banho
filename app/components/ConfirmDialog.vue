<script lang="ts" setup>
const props = defineProps<{
  title: string
  description: string
  onConfirm: () => Promise<void> | void
}>()

const open = defineModel<boolean>("open", { default: false })
const isLoading = ref(false)

async function handleConfirm() {
  isLoading.value = true

  try {
    await props.onConfirm()
    open.value = false
  } catch (error) {
    console.error("Confirmation action failed:", error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal :title="props.title" v-model:open="open" :ui="{ footer: 'justify-end' }">
    <template #body>
      <p>
        {{ props.description }}
      </p>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        @click="open = false"
        :disabled="isLoading"
        class="cursor-pointer"
      >
        Cancelar
      </UButton>
      <UButton @click="handleConfirm" :loading="isLoading" class="text-white cursor-pointer">
        Confirmar
      </UButton>
    </template>
  </UModal>
</template>
