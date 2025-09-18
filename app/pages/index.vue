<script lang="ts" setup>
const router = useRouter();
</script>

<template>
  <div class="h-dvh w-full relative font-Inter">
    <div
      class="bg-[url('@/assets/images/bg-login.jpg')] h-dvh w-full bg-cover bg-center brightness-[30%] absolute"
    ></div>

    <div class="container mx-auto px-4 relative z-10 flex flex-col items-center h-full">
      <nav
        class="border border-zinc-500 bg-zinc-800/90 w-full max-w-3xl rounded-xl p-3 mt-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <img src="@/assets/images/icon.svg" alt="Logo Hora do Banho" class="size-10" />
          <p class="font-Poppins text-xl font-semibold">Hora do Banho</p>
        </div>

        <div>
          <UButton
            variant="solid"
            color="neutral"
            size="lg"
            class="cursor-pointer w-24 flex items-center text-base justify-center"
            @click="router.push('/login')"
          >
            Entrar
          </UButton>
        </div>
      </nav>

      <div class="text-center text-white max-w-3xl h-full flex flex-col items-center justify-center">
        <h1 class="text-3xl md:text-4xl font-bold text-shadow-sm mb-6 text-shadow-zinc-700 leading-tight">
          Transforme a gestão do seu <span class="bg-primary px-1">banho e tosa</span> de forma inteligente
        </h1>

        <p class="text-lg md:text-2xl text-zinc-200 text-shadow-sm text-shadow-zinc-700 leading-tight">
          Aumente a produtividade do seu negócio com um sistema completo para agendamento e gestão de serviços de banho
          e tosa para pets.
        </p>

        <UButton size="xl" class="text-white text-base px-6 py-3 mt-12 cursor-pointer" @click="router.push('/login')">
          <Icon name="tabler:rocket" class="size-6" />
          Começar Agora
        </UButton>
      </div>
    </div>
  </div>
</template>
