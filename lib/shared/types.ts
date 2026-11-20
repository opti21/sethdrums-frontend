export const PG_STATUSES = ["NOT_CHECKED", "BEING_CHECKED", "PG", "NON_PG"] as const;
export type PgStatus = (typeof PG_STATUSES)[number];

// Shapes the API returns (dates arrive as strings).

export type PgStatusRow = {
  id: number;
  video_id: number;
  status: PgStatus;
  checker: string | null;
};

export type VideoInfo = {
  id: number;
  youtube_id: string;
  title: string;
  channel: string;
  duration: number | null;
  thumbnail: string;
  notes?: string;
  banned?: boolean;
  PG_Status?: PgStatusRow | null;
};

export type RequestInfo = {
  id: number;
  requested_by: string;
  requested_by_id: string | null;
  played: boolean;
  played_at?: string | null;
  priority: boolean;
  raffle_prio?: boolean;
  mod_prio?: boolean;
  vod_link?: string | null;
  Video: VideoInfo;
};

export type QueueFlags = {
  is_open: boolean;
  is_paused: boolean;
  is_subOnly: boolean;
};

export type PublicQueue = QueueFlags & {
  order: RequestInfo[];
  now_playing: RequestInfo | null;
  recentlyPlayed: RequestInfo[];
};

export type ModQueue = QueueFlags & {
  order: RequestInfo[];
  now_playing: RequestInfo | null;
  is_updating: boolean;
  being_updated_by: string;
};
