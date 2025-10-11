import type { SelectClient } from "~~/server/database/schema"

export const useClients = () => {
  const {
    data: clients,
    pending: isLoading,
    error,
    refresh: refreshClients,
  } = useLazyFetch<SelectClient[]>("/api/clients", {
    key: "clients",
    default: () => [],
  })

  const statistics = computed(() => {
    const clientList = clients.value || []
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    return {
      total: clientList.length,
      active: clientList.filter(client => client.isActive).length,
      inactive: clientList.filter(client => !client.isActive).length,
      recent: clientList.filter(client => client.createdAt >= thirtyDaysAgo).length,
    }
  })

  const filterClients = (searchTerm: string) => {
    return computed(() => {
      if (!searchTerm) return clients.value || []

      return (
        clients.value?.filter(
          client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.phone?.includes(searchTerm)
        ) || []
      )
    })
  }

  return {
    clients: clients,
    isLoading: isLoading,
    error: error,
    statistics,
    refreshClients,
    filterClients,
  }
}
