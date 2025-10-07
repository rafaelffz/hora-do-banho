import { db } from "../../database"
import { users } from "../../database/schema"
import { eq } from "drizzle-orm"
import { H3Event } from "h3"

export default defineOAuthGoogleEventHandler({
  async onSuccess(event: H3Event, { user }: any) {
    const existingUser = await db.select().from(users).where(eq(users.email, user.email)).get()

    if (!existingUser) {
      await db.insert(users).values({
        name: user.name,
        email: user.email,
        avatar: user.picture,
      })
    }

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture,
      },
    })

    return sendRedirect(event, "/dashboard/schedulings")
  },
  onError(event: H3Event, error: any) {
    console.error("Google OAuth error:", error)
    return sendRedirect(event, "/")
  },
})
