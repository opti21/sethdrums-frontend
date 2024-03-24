import {
  removeFromOrder,
  updateNowPlaying,
} from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import duration from "dayjs/plugin/duration";
dayjs.extend(utc);
dayjs.extend(duration);
import axios from "axios";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const queueApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send("Not a mod");
    }

    if (req.method === "POST") {
      // TODO: validate body
      if (req.body.requestID) {
        try {
          await prisma.request.update({
            where: {
              id: parseInt(req.body.requestID),
            },
            data: {
              played: true,
              played_at: dayjs.utc().format(),
            },
          });

          await generateVodLink(parseInt(req.body.requestID));
        } catch (err) {
          if (err instanceof PrismaClientKnownRequestError) {
            if (err.code === "P2025") {
              return res
                .status(422)
                .json({ success: false, error: "Request does not exist" });
            } else {
              console.error(err);
              return res.status(500).json({
                success: false,
                error: "Prisma error marking request played",
              });
            }
          }
        }

        const nowPlayingUpdate = await updateNowPlaying(req.body.requestID);
        if (!nowPlayingUpdate) {
          return res.status(500).json({ error: "Server error" });
        }
        const removedFromQueue = await removeFromOrder(
          req.body.requestID.toString()
        );
        if (!removedFromQueue) {
          return res.status(500).json({ error: "Server error" });
        }

        return res.status(200).json({ success: true });
      } else {
        console.error("Missing query params for now playing");
        return res
          .status(400)
          .json({ success: false, message: "missing query params" });
      }
    } else if (req.method === "DELETE") {
      const nowPlayingUpdate = await updateNowPlaying("");
      if (!nowPlayingUpdate) {
        res.status(500).json({ error: "Server error" });
      }
      return res.status(200).json({ success: true });
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default queueApiHandler;

const generateVodLink = async (requestID: number) => {
  try {
    const token_db = await prisma.twitchCreds
      .findUnique({
        where: {
          id: 1,
        },
      })
      .catch((e) => {
        console.error(e);
      });

    let TWITCH_TOKEN: string;

    if (!token_db) {
      let tokenResponse = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
      );
      const tokenData = tokenResponse.data;

      await prisma.twitchCreds
        .create({
          data: {
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
          },
        })
        .catch((e) => {
          console.error(e);
        });

      TWITCH_TOKEN = tokenData.access_token;
    } else {
      TWITCH_TOKEN = token_db.access_token;
    }

    //147155277

    let vidFetch = await fetch(
      "https://api.twitch.tv/helix/videos?user_id=147155277",
      {
        headers: {
          Authorization: "Bearer " + TWITCH_TOKEN,
          "Client-ID": `${process.env.TWITCH_CLIENT_ID}`,
        },
      }
    );

    let vod_link: string;

    if (vidFetch.status === 200) {
      const vidJSON = await vidFetch.json();
      const { data: videos } = vidJSON;

      const started_at = dayjs(videos[0].published_at).utc();
      const now = dayjs().utc();

      const difference = now.diff(started_at);
      const offset = dayjs.duration(difference).format("HH[h]mm[m]ss[s]");
      // console.log(offset);

      vod_link = videos[0].url + "?t=" + offset;
    } else {
      const vidError = await vidFetch.json();
      console.error(vidError);
    }

    // Update request with vod link

    await prisma.request
      .update({
        where: {
          id: requestID,
        },
        data: {
          vod_link: vod_link,
        },
      })
      .catch((e) => {
        console.error(e);
      });
  } catch (error) {
    console.error(error);
  }
};
