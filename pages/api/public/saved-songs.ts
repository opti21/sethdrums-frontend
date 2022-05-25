import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";

const savedSongsApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSession(req, res);
    if (process.env.NODE_ENV === "development") {
      if (session.user.sub.split("|")[0] === "auth0") {
        session.user.sub = "auth0|test_user|test_user_id";
        session.user.preferred_username = "test_user";
      }
    }

    if (req.method === "GET") {
      try {
        const savedSongs = await prisma.savedSongs.findFirst({
          where: {
            twitch_id: session.user.sub.split("|")[2],
          },
          select: {
            saved_videos: {
              select: {
                id: true,
                youtube_id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        });

        if (!savedSongs) {
          return res.status(200).json([]);
        }

        return res.status(200).json(savedSongs.saved_videos);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    } else if (req.method === "DELETE") {
      try {
        await prisma.savedSongs.update({
          where: {
            twitch_id: session.user.sub.split("|")[2],
          },
          data: {
            saved_videos: {
              disconnect: { id: req.body.video_id },
            },
          },
        });

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default savedSongsApiHandler;
