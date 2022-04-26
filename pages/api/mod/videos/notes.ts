import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { withSentry } from "@sentry/nextjs";

const videoApiHandler = withSentry(
  withApiAuthRequired(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
      // TODO: validate body
      await prisma.video
        .update({
          where: {
            id: req.body.videoID,
          },
          data: {
            notes: req.body.notes,
          },
        })
        .catch((err) => {
          console.error(err);

          return res
            .status(500)
            .json({ success: false, message: "Error updating video notes" });
        });
      return res.status(200).json({ success: true });
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  })
);

export default videoApiHandler;
