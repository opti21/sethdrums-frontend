-- CreateTable
CREATE TABLE "Request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requested_by" TEXT NOT NULL,
    "video_id" INTEGER NOT NULL,
    "queue_id" INTEGER DEFAULT 2,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "played_at" DATETIME,
    "vod_link" TEXT,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "raffle_prio" BOOLEAN NOT NULL DEFAULT false,
    "mod_prio" BOOLEAN NOT NULL DEFAULT false,
    "requested_by_id" TEXT,
    CONSTRAINT "Request_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TagsOnRequests" (
    "request_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    PRIMARY KEY ("request_id", "tag_id"),
    CONSTRAINT "TagsOnRequests_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "RequestTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TagsOnRequests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PG_Status" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "video_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "checker" TEXT,
    "timestamp" INTEGER,
    "previous_status" TEXT,
    "previous_checker" TEXT,
    CONSTRAINT "PG_Status_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "youtube_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "region_blocked" BOOLEAN,
    "embed_blocked" BOOLEAN,
    "duration" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail" TEXT NOT NULL,
    "banned_by" TEXT,
    "banned_time" DATETIME
);

-- CreateTable
CREATE TABLE "VideoTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TagsOnVideos" (
    "video_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    PRIMARY KEY ("video_id", "tag_id"),
    CONSTRAINT "TagsOnVideos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TagsOnVideos_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "VideoTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "twitch_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TwitchCreds" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "access_token" TEXT NOT NULL,
    "expires_in" INTEGER,
    "expires" INTEGER
);

-- CreateTable
CREATE TABLE "SavedSongs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "twitch_id" TEXT NOT NULL,
    "saved_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BannedUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "twitch_id" TEXT NOT NULL,
    "twitch_username" TEXT NOT NULL,
    "reason" TEXT,
    "banned_by" TEXT NOT NULL,
    "banned_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_SavedSongsToVideo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_SavedSongsToVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "SavedSongs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SavedSongsToVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PG_Status_video_id_key" ON "PG_Status"("video_id");

-- CreateIndex
CREATE UNIQUE INDEX "Video_youtube_id_key" ON "Video"("youtube_id");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSongs_twitch_id_key" ON "SavedSongs"("twitch_id");

-- CreateIndex
CREATE UNIQUE INDEX "BannedUser_twitch_id_key" ON "BannedUser"("twitch_id");

-- CreateIndex
CREATE UNIQUE INDEX "_SavedSongsToVideo_AB_unique" ON "_SavedSongsToVideo"("A", "B");

-- CreateIndex
CREATE INDEX "_SavedSongsToVideo_B_index" ON "_SavedSongsToVideo"("B");
