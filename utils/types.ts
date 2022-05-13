import { PG_Status, Video } from "@prisma/client";
import { Request } from "../redis/handlers/Request";

export interface YTApiResponse {
  kind: string;
  etag: string;
  items: Item[];
  pageInfo: PageInfo;
}

export interface Item {
  kind: string;
  etag: string;
  id: string;
  snippet: Snippet;
  contentDetails: ContentDetails;
  statistics: Statistics;
}

export interface Snippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: Thumbnails;
  channelTitle: string;
  tags: string[];
  categoryId: string;
  liveBroadcastContent: string;
  defaultLanguage: string;
  localized: Localized;
  defaultAudioLanguage: string;
}

export interface Thumbnails {
  default: Default;
  medium: Medium;
  high: High;
  standard: Standard;
  maxres: Maxres;
}

export interface Default {
  url: string;
  width: number;
  height: number;
}

export interface Medium {
  url: string;
  width: number;
  height: number;
}

export interface High {
  url: string;
  width: number;
  height: number;
}

export interface Standard {
  url: string;
  width: number;
  height: number;
}

export interface Maxres {
  url: string;
  width: number;
  height: number;
}

export interface Localized {
  title: string;
  description: string;
}

export interface ContentDetails {
  duration: string;
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  contentRating: number; // this may need to change but not needed
  projection: string;
}

export interface Statistics {
  viewCount: string;
  likeCount: string;
  favoriteCount: string;
  commentCount: string;
}

export interface PageInfo {
  totalResults: number;
  resultsPerPage: number;
}

export interface AlreadyRequestedResponse {
  request: Request | null;
  video: Video | null;
  pgStatus: PG_Status | null;
}

export interface IQueue {
  order: IApiRequest[];
  is_updating: boolean;
  being_updated_by: string;
  now_playing: IApiRequest | null;
  is_open: boolean;
}

export interface IAPiVideo extends Video {
  PG_Status?: PG_Status;
}

export interface IApiRequest {
  id: string;
  requested_by: string;
  requested_by_id: string;
  video_id: string;
  played: boolean;
  played_at: string;
  priority: boolean;
  mod_prio: boolean;
  Video: IAPiVideo;
}

export enum Status {
  NotChecked = "NOT_CHECKED",
  BeingChecked = "BEING_CHECKED",
  PG = "PG",
  NonPG = "NON_PG",
}
