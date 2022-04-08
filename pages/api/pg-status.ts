import { getSession } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import { getPgStatus, updatePGStatus } from "../../redis/handlers/PgStatus";

const pgStatusApiHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === "PUT") {
    try {
      const session = getSession(req, res);
      // TODO: validate body
      if (req.body.status != "NOT_CHECKED") {
        updatePGStatus({
          entityID: req.body.entityID,
          checker: session?.user.preferred_username,
          status: req.body.status,
        });
        return res.status(200).json({ success: true });
      }

      updatePGStatus({
        entityID: req.body.entityID,
        checker: "",
        status: req.body.status,
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
};

export default pgStatusApiHandler;
