import { auth } from "../../app/lib/auth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
