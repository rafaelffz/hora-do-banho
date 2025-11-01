import { eq, and, count } from "drizzle-orm"
import { db } from "~~/server/database"
import {
  clientSubscriptions,
  clients,
  packagePrices,
  calculateMultiPetDiscount,
  applyAdjustment,
} from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import z4 from "zod/v4"

const calculatePriceSchema = z4.object({
  clientId: z4.string().uuid("Cliente inválido"),
  packagePriceId: z4.string().uuid("Preço do pacote inválido"),
  customAdjustmentPercentage: z4.number().min(-100).max(100).optional(),
})

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(event, calculatePriceSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    // Verificar se o cliente pertence ao usuário
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, result.data.clientId), eq(clients.userId, session.user.id)),
    })

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: "Cliente não encontrado",
      })
    }

    // Buscar informações do packagePrice
    const packagePrice = await db.query.packagePrices.findFirst({
      where: eq(packagePrices.id, result.data.packagePriceId),
    })

    if (!packagePrice) {
      throw createError({
        statusCode: 404,
        statusMessage: "Preço do pacote não encontrado",
      })
    }

    // Contar quantas subscriptions ativas o cliente já tem
    const [{ count: activeSubscriptionsCount }] = await db
      .select({ count: count() })
      .from(clientSubscriptions)
      .where(
        and(
          eq(clientSubscriptions.clientId, result.data.clientId),
          eq(clientSubscriptions.isActive, true)
        )
      )

    // Calcular desconto por múltiplos pets (incluindo a nova subscription)
    const totalSubscriptions = activeSubscriptionsCount + 1
    const multiPetDiscountPercentage = calculateMultiPetDiscount(totalSubscriptions)

    // Aplicar desconto customizado se fornecido, senão usar desconto automático
    const adjustmentPercentage =
      result.data.customAdjustmentPercentage ?? multiPetDiscountPercentage

    const basePrice = packagePrice.price
    const { finalPrice, adjustmentValue } = applyAdjustment(basePrice, adjustmentPercentage)

    // Determinar razão do ajuste
    let adjustmentReason = null
    if (adjustmentPercentage !== 0) {
      if (result.data.customAdjustmentPercentage !== undefined) {
        adjustmentReason = "outros"
      } else if (multiPetDiscountPercentage < 0) {
        adjustmentReason = "desconto_multiplos_pets"
      }
    }

    return {
      basePrice,
      finalPrice: Math.max(finalPrice, 0), // Garantir que não seja negativo
      adjustmentValue,
      adjustmentPercentage,
      adjustmentReason,
      calculations: {
        activeSubscriptionsCount,
        totalSubscriptionsAfter: totalSubscriptions,
        multiPetDiscountApplied: multiPetDiscountPercentage,
        customAdjustmentApplied: result.data.customAdjustmentPercentage,
      },
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: error,
    })
  }
})
