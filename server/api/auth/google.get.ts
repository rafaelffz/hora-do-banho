import { db } from "../../database"
import { users } from "../../database/schema"
import { eq } from "drizzle-orm"
import { H3Event } from "h3"

export default defineOAuthGoogleEventHandler({
  async onSuccess(event: H3Event, { user }: any) {
    let existingUser = await db.select().from(users).where(eq(users.email, user.email)).get()

    if (!existingUser) {
      const [createdUser] = await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          avatar: user.picture,
        })
        .returning()

      existingUser = createdUser
    }

    await setUserSession(event, {
      user: {
        id: existingUser.id,
        email: user.email,
        name: user.name,
        avatar: user.picture,
      },
    })

    const session = await getUserSession(event)
    console.log(session)

    return sendRedirect(event, "/dashboard/schedulings")
  },
  onError(event: H3Event, error: any) {
    console.error("Google OAuth error:", error)
    return sendRedirect(event, "/")
  },
})
