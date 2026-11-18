import { handleAuth, handleLogin } from "@auth0/nextjs-auth0";

if (!process.env.AUTH0_SECRET) {
  throw new Error("NO AUTH0 SECRET");
}

export default handleAuth({
  async login(req, res) {
    try {
      if (req.query.returnTo) {
        await handleLogin(req, res, {
          returnTo: req.query.returnTo.toString(),
        });
        return;
      }
      await handleLogin(req, res);
    } catch (error) {
      res.status(error.status || 500).end(error.message);
    }
  },
});
