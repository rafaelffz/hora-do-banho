import { ZodError } from "zod/v4"
import { H3Event } from "h3"

export function sendZodError(event: H3Event, error: ZodError) {
  const statusMessage = error.issues
    .map(issue => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ")

  throw createError({
    statusCode: 400,
    statusMessage,
  })
}
