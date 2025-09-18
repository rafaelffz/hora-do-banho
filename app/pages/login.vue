<script lang="ts" setup>
const authStore = useAuthStore();

const router = useRouter();
</script>

<template>
  <div class="h-dvh w-full font-Inter">
    <div class="bg-[url('@/assets/images/bg-login.jpg')] h-dvh w-full bg-contain brightness-[30%] absolute"></div>

    <div class="flex flex-col size-full justify-center items-center px-8 gap-8">
      <div class="w-full max-w-xl rounded-xl bg-zinc-100 brightness-90 z-10 p-4 space-y-8">
        <div class="flex items-center justify-start w-full">
          <img src="@/assets/images/icon.svg" alt="Logo Hora do Banho" class="size-12" />
        </div>

        <div class="p-2 space-y-8">
          <div class="text-black text-3xl font-bold text-center">
            <div class="space-y-6">
              <h1 class="text-balance text-2xl md:text-3xl text-zinc-800">
                Entre na <span class="text-primary">Hora do Banho</span> e agende os banhos dos pets com facilidade!
              </h1>
              <p class="mt-2 text-sm md:text-base font-normal text-balance text-zinc-600">
                Não perca tempo, faça login com sua conta Google e aproveite todos os benefícios da nossa plataforma.
              </p>
            </div>
          </div>

          <div>
            <UButton variant="subtle" color="primary" class="cursor-pointer" block @click="authStore.signIn">
              <Icon name="devicon:google" />
              Entrar com o Google
            </UButton>
          </div>
        </div>
      </div>

      <UButton variant="solid" class="z-10 cursor-pointer text-white" @click="router.push('/')">
        <Icon name="tabler:arrow-left" />
        Voltar para Página Inicial
      </UButton>
    </div>
  </div>
</template>
