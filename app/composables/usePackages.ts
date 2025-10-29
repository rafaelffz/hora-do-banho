import type { SelectPackage, SelectPackageList } from "~~/server/database/schema"

export const usePackages = () => {
  const {
    data: packages,
    pending: isLoading,
    error,
    refresh: refreshPackages,
  } = useLazyFetch<SelectPackage[]>("/api/packages", {
    key: "packages",
    default: () => [],
  })

  const {
    data: packagesList,
    pending: isLoadingList,
    error: errorList,
    refresh: refreshPackagesList,
  } = useLazyFetch<SelectPackageList[]>("/api/package-prices/list", {
    key: "packages-list",
    default: () => [],
  })

  const statistics = computed(() => {
    const packageList = packages.value || []
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    return {
      total: packageList.length,
      active: packageList.filter(pkg => pkg.isActive).length,
      inactive: packageList.filter(pkg => !pkg.isActive).length,
      recent: packageList.filter(pkg => pkg.createdAt >= thirtyDaysAgo).length,
    }
  })

  const durationOptions = [
    { label: "30 min", value: 30 },
    { label: "45 min", value: 45 },
    { label: "1h", value: 60 },
    { label: "1h 15min", value: 75 },
    { label: "1h 30min", value: 90 },
    { label: "1h 45min", value: 105 },
    { label: "2h", value: 120 },
    { label: "2h 30min", value: 150 },
    { label: "3h", value: 180 },
  ]

  const filterPackages = (searchTerm: string) => {
    return computed(() => {
      if (!searchTerm) return packages.value || []

      return (
        packages.value?.filter(
          pkg =>
            pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ) || []
      )
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `${hours}h`
    }

    return `${hours}h ${remainingMinutes}min`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  return {
    packages: packages,
    isLoading: isLoading,
    error: error,
    packagesList,
    isLoadingList,
    errorList,
    statistics,
    durationOptions,
    refreshPackages,
    refreshPackagesList,
    filterPackages,
    formatDuration,
    formatPrice,
  }
}
