import { NextApiRequest, NextApiResponse } from "next";

const videoApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "PUT") {
    // TODO: validate body
    return res.status(200).json({ success: true });
  } else {
    res.status(405).send(`${req.method} is not a valid`);
  }
};

export default videoApiHandler;
