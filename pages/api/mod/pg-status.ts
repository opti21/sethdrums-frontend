import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";
import { withSentry } from "@sentry/nextjs";

const pgStatusApiHandler = withSentry(
  withApiAuthRequired(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send("Not a mod");
    }

    if (req.method === "PUT") {
      try {
        // TODO: validate body
        if (req.body.status != "NOT_CHECKED") {
          await prisma.pG_Status.update({
            where: {
              id: req.body.pgStatusID,
            },
            data: {
              checker: session?.user.preferred_username,
              status: req.body.status,
            },
          });
          return res.status(200).json({ success: true });
        }
        await prisma.pG_Status.update({
          where: {
            id: req.body.pgStatusID,
          },
          data: {
            checker: "",
            status: req.body.status,
          },
        });
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ success: false, messge: "Erro updating PG" });
      }
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  })
);

export default pgStatusApiHandler;
