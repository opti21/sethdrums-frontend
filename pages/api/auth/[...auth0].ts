import { handleAuth } from "@auth0/nextjs-auth0";

if (!process.env.AUTH0_SECRET) {
  throw new Error("NO AUTH0 SECRET");
}

export default handleAuth();
