import { applyAdjustment, calculateMultiPetDiscount, extractManualAdjustment } from "../database/schema"

export const calculateSubscriptionPricing = (
  basePrice: number,
  subscriptionData: any,
  totalPetsWithSubscription: number,
  isFirstPet: boolean = false
) => {
  const manualAdjustmentPercentage = extractManualAdjustment(
    subscriptionData.adjustmentPercentage || 0,
    subscriptionData.adjustmentReason || null,
    totalPetsWithSubscription
  )

  let finalAdjustmentPercentage = manualAdjustmentPercentage
  let finalAdjustmentReason = null

  if (manualAdjustmentPercentage !== 0) {
    finalAdjustmentReason = "outros"
  }

  if (isFirstPet && totalPetsWithSubscription > 1) {
    const multiPetDiscount = calculateMultiPetDiscount(totalPetsWithSubscription)
    finalAdjustmentPercentage = manualAdjustmentPercentage + multiPetDiscount

    if (multiPetDiscount < 0) {
      finalAdjustmentReason = "desconto_multiplos_pets"
    }
  }

  const { finalPrice, adjustmentValue } = applyAdjustment(basePrice, finalAdjustmentPercentage)

  return {
    finalPrice,
    adjustmentValue,
    adjustmentPercentage: finalAdjustmentPercentage,
    adjustmentReason: finalAdjustmentReason,
  }
}