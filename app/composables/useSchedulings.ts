export const useSchedulings = () => {
  const createScheduling = async (data: {
    clientId: string
    petIds: string[]
    pickupDate: number
    pickupTime?: string | null
    basePrice: number
    finalPrice: number
    adjustmentValue?: number
    adjustmentPercentage?: number
    adjustmentReason?: string | null
    notes?: string | null
  }) => {
    try {
      const result = await $fetch("/api/schedulings", {
        method: "POST",
        body: data,
      })
      return result
    } catch (error) {
      throw error
    }
  }

  const updateScheduling = async (
    schedulingId: string,
    status: "scheduled" | "completed" | "cancelled"
  ) => {
    try {
      const result = await $fetch(`/api/schedulings/${schedulingId}`, {
        method: "PATCH",
        body: { status },
      })
      return result
    } catch (error) {
      throw error
    }
  }

  return {
    createScheduling,
    updateScheduling,
  }
}
