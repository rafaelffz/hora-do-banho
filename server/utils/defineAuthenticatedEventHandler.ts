import { H3Event } from "h3"

export function defineAuthenticatedEventHandler<T>(handler: (event: H3Event) => T) {
  return defineEventHandler(async event => {
    const session = await getUserSession(event)

    if (!session) {
      throw createError({ statusCode: 401, statusMessage: "Unauthenticated" })
    }

    return handler(event)
  })
}
