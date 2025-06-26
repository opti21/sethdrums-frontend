import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";

const isModHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    const isMod = await prisma.mod.findMany({
      where: {
        twitch_id: session.user.sub.split("|")[2] || "",
      },
    });

    if (req.method === "GET") {
      if (isMod.length === 0) {
        return res.status(403).send("Not a mod");
      }
      if (isMod[0].twitch_id === "147155277") {
        return res.status(201).send("Has a huge forehead");
      }
      return res.status(200).send("Is a mod");
    } else {
      res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default isModHandler;
