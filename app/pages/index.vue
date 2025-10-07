<script lang="ts" setup>
const { loggedIn } = useUserSession()

if (loggedIn.value) {
  navigateTo("/dashboard")
}
</script>

<template>
  <div class="h-dvh w-full relative font-Inter">
    <div
      class="bg-[url('@/assets/images/bg-login.jpg')] h-dvh w-full bg-cover bg-center brightness-[30%] absolute"
    ></div>

    <div class="container mx-auto px-4 relative z-10 flex flex-col items-center h-full">
      <nav
        class="bg-gray-200/90 dark:bg-gray-800/90 border border-gray-600 w-full max-w-3xl rounded-xl p-2 mt-4 flex items-center justify-between"
      >
        <Logo />

        <div class="flex items-center gap-2">
          <UColorModeButton class="cursor-pointer" />

          <UButton
            variant="solid"
            class="cursor-pointer w-24 text-white flex items-center justify-center"
            to="/login"
          >
            Entrar
          </UButton>
        </div>
      </nav>

      <div
        class="text-center text-white max-w-3xl h-full flex flex-col items-center justify-center"
      >
        <h1
          class="text-3xl md:text-4xl font-bold text-shadow-sm mb-6 text-shadow-gray-700 leading-tight"
        >
          Transforme a gestão do seu <span class="bg-primary px-1">banho e tosa</span> de forma
          inteligente
        </h1>

        <p
          class="text-lg md:text-2xl text-gray-200 text-shadow-sm text-shadow-gray-700 leading-tight"
        >
          Aumente a produtividade do seu negócio com um sistema completo para agendamento e gestão
          de serviços de banho e tosa para pets.
        </p>

        <UButton size="xl" class="text-white text-base px-6 py-3 mt-12 cursor-pointer" to="/login">
          <Icon name="tabler:rocket" class="size-6" />
          Começar Agora
        </UButton>
      </div>
    </div>
  </div>
</template>
