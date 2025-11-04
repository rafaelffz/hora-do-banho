export const useSubscriptions = () => {
  const daysOfWeek = [
    { label: "Domingo", value: 0 },
    { label: "Segunda-feira", value: 1 },
    { label: "Terça-feira", value: 2 },
    { label: "Quarta-feira", value: 3 },
    { label: "Quinta-feira", value: 4 },
    { label: "Sexta-feira", value: 5 },
    { label: "Sábado", value: 6 },
  ] as const

  const getDayOfWeekLabel = (dayOfWeek: number) => {
    return daysOfWeek.find(day => day.value === dayOfWeek)?.label || "Desconhecido"
  }

  const formatPickupTime = (time: string | null) => {
    if (!time) return "Não definido"
    return time
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR")
  }

  const calculateMultiPetDiscount = (subscriptionCount: number): number => {
    if (subscriptionCount >= 3) return -15
    if (subscriptionCount >= 2) return -10
    return 0
  }

  const applyAdjustment = (
    basePrice: number,
    adjustmentPercentage: number
  ): {
    finalPrice: number
    adjustmentValue: number
  } => {
    const adjustmentValue = (basePrice * adjustmentPercentage) / 100
    const finalPrice = basePrice + adjustmentValue
    return { finalPrice, adjustmentValue }
  }

  const calculatePriceWithAdjustment = (basePrice: number, adjustmentPercentage: number = 0) => {
    const { finalPrice, adjustmentValue } = applyAdjustment(basePrice, adjustmentPercentage)
    return {
      basePrice,
      adjustmentValue,
      adjustmentPercentage,
      finalPrice,
      formattedBasePrice: formatPrice(basePrice),
      formattedAdjustmentValue: formatPrice(adjustmentValue),
      formattedFinalPrice: formatPrice(finalPrice),
    }
  }

  const getNextPickupDescription = (nextPickupDate: number | null, pickupDayOfWeek: number) => {
    if (!nextPickupDate) {
      return `Toda ${getDayOfWeekLabel(pickupDayOfWeek).toLowerCase()}`
    }

    const nextDate = new Date(nextPickupDate)
    const today = new Date()
    const diffTime = nextDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "Hoje"
    } else if (diffDays === 1) {
      return "Amanhã"
    } else if (diffDays < 7) {
      return `Em ${diffDays} dias`
    } else {
      return formatDate(nextPickupDate)
    }
  }

  return {
    daysOfWeek,
    getDayOfWeekLabel,
    formatPickupTime,
    formatPrice,
    formatDate,
    calculateMultiPetDiscount,
    applyAdjustment,
    calculatePriceWithAdjustment,
    getNextPickupDescription,
  }
}
