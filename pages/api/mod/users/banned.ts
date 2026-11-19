import { removeFromOrder } from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { pusher } from "../../../../lib/pusher";
dayjs.extend(utc);

const userBanApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send({ success: false, message: "Not a mod" });
    }

    if (req.method === "GET") {
      // List all banned users
      const bannedUsers = await prisma.bannedUser
        .findMany({
          orderBy: { banned_time: "desc" },
        })
        .catch((err) => {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Error finding banned users" });
        });

      return res.status(200).json(bannedUsers);
    } else if (req.method === "POST") {
      // Ban a user
      const { twitch_id, twitch_username, reason } = req.body;

      console.log("[BanUser] Attempting to ban user:", { twitch_id, twitch_username, reason });

      if (!twitch_id || !twitch_username) {
        console.log("[BanUser] Missing required fields:", { twitch_id, twitch_username });
        return res.status(400).json({
          success: false,
          message: "Missing twitch_id or twitch_username",
        });
      }

      // Check if target user is a mod - mods can't ban mods
      const targetIsMod = await prisma.mod.findFirst({
        where: { twitch_id },
      });

      if (targetIsMod) {
        console.log("[BanUser] Cannot ban mod:", twitch_username);
        return res.status(403).json({
          success: false,
          message: "Cannot ban a moderator",
        });
      }

      // Check if user is already banned
      const existingBan = await prisma.bannedUser.findUnique({
        where: { twitch_id },
      });

      if (existingBan) {
        console.log("[BanUser] User already banned:", twitch_username);
        return res.status(409).json({
          success: false,
          message: "User is already banned",
        });
      }

      // Create ban record
      try {
        await prisma.bannedUser.create({
          data: {
            twitch_id,
            twitch_username,
            reason: reason || null,
            banned_by: session.user.preferred_username,
            banned_time: dayjs.utc().toDate(),
          },
        });
        console.log("[BanUser] Successfully banned user:", twitch_username);
      } catch (err) {
        console.error("[BanUser] Error creating ban record:", err);
        return res
          .status(500)
          .json({ success: false, message: "Error banning user" });
      }

      // Find and remove all pending requests by this user
      const pendingRequests = await prisma.request.findMany({
        where: {
          requested_by_id: twitch_id,
          played: false,
        },
      });

      // Remove from Redis queue and delete requests
      let removedCount = 0;
      for (const request of pendingRequests) {
        const removedFromQueue = await removeFromOrder(request.id.toString());
        if (removedFromQueue) {
          await prisma.request
            .delete({ where: { id: request.id } })
            .catch((err) => {
              console.error("Error deleting request:", err);
            });
          removedCount++;
        }
      }

      // Trigger queue update if requests were removed
      if (removedCount > 0) {
        await pusher.trigger(
          process.env.NEXT_PUBLIC_PUSHER_CHANNEL!,
          "update-queue",
          {}
        );
      }

      console.log("[BanUser] Ban complete, removed requests:", removedCount);
      return res.status(200).json({
        success: true,
        removedRequests: removedCount,
      });
    } else if (req.method === "DELETE") {
      // Unban a user
      const { twitch_id } = req.body;

      if (!twitch_id) {
        return res.status(400).json({
          success: false,
          message: "Missing twitch_id",
        });
      }

      await prisma.bannedUser
        .delete({
          where: { twitch_id },
        })
        .catch((err) => {
          console.error("Error unbanning user:", err);
          return res
            .status(500)
            .json({ success: false, message: "Error unbanning user" });
        });

      return res.status(200).json({ success: true });
    } else {
      return res.status(405).send(`${req.method} is not valid`);
    }
  }
);

export default userBanApiHandler;
