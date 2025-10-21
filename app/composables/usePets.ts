export const usePets = () => {
  const runtimeConfig = useRuntimeConfig()

  const { data: breedsData } = useLazyFetch<BreedsResponse[]>(
    "https://api.thedogapi.com/v1/breeds",
    {
      cache: "force-cache",
      headers: {
        "x-api-key": runtimeConfig.public.dogApiKey || "",
      },
    }
  )

  return {
    breeds: breedsData,
  }
}
