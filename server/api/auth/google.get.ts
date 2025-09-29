import { db } from "../../database";
import { users } from "../../database/schema";
import { eq } from "drizzle-orm";

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    const existingUser = await db.select().from(users).where(eq(users.email, user.email)).get();
    console.log(existingUser);

    if (!existingUser) {
      await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          image: user.picture,
        })
        .returning();
    }

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.image,
      },
    });

    return sendRedirect(event, "/dashboard");
  },
  onError(event, error) {
    console.error("Google OAuth error:", error);
    return sendRedirect(event, "/");
  },
});
