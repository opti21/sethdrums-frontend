import "server-only";
import { RequestError, type RequestErrorCode } from "./videos";

const messages: Record<RequestErrorCode, string> = {
  not_found: "Couldn't find that video on YouTube",
  region_blocked: "Video must be playable in the US",
  banned: "Requests must be PG13, please request another.",
  youtube_error: "Couldn't reach YouTube, please try again",
};

export function requestErrorMessage(error: unknown): string | null {
  return error instanceof RequestError ? messages[error.code] : null;
}
