import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import axios from "axios";

const getTwitchToken = async (): Promise<string> => {
  const token_db = await prisma.twitchCreds.findUnique({
    where: { id: 1 },
  });

  if (token_db) {
    return token_db.access_token;
  }

  // Get new token
  const tokenResponse = await axios.post(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
  );

  await prisma.twitchCreds.create({
    data: {
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in,
    },
  });

  return tokenResponse.data.access_token;
};

const userLookupHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).json({ success: false, message: "Not a mod" });
    }

    if (req.method === "GET") {
      const { username } = req.query;

      if (!username || typeof username !== "string") {
        return res.status(400).json({
          success: false,
          message: "Missing username parameter",
        });
      }

      try {
        const token = await getTwitchToken();

        const response = await fetch(
          `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Client-ID": process.env.TWITCH_CLIENT_ID!,
            },
          }
        );

        if (response.status === 401) {
          // Token expired, delete and retry
          await prisma.twitchCreds.delete({ where: { id: 1 } }).catch(() => {});
          const newToken = await getTwitchToken();

          const retryResponse = await fetch(
            `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
            {
              headers: {
                Authorization: `Bearer ${newToken}`,
                "Client-ID": process.env.TWITCH_CLIENT_ID!,
              },
            }
          );

          const retryData = await retryResponse.json();
          if (retryData.data && retryData.data.length > 0) {
            return res.status(200).json({
              success: true,
              user: {
                id: retryData.data[0].id,
                login: retryData.data[0].login,
                display_name: retryData.data[0].display_name,
              },
            });
          }
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
          return res.status(200).json({
            success: true,
            user: {
              id: data.data[0].id,
              login: data.data[0].login,
              display_name: data.data[0].display_name,
            },
          });
        } else {
          return res.status(404).json({
            success: false,
            message: "User not found on Twitch",
          });
        }
      } catch (err) {
        console.error("[UserLookup] Error:", err);
        return res.status(500).json({
          success: false,
          message: "Error looking up user",
        });
      }
    } else {
      return res.status(405).json({ message: `${req.method} is not valid` });
    }
  }
);

export default userLookupHandler;
