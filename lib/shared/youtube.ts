import urlParser from "js-video-url-parser/lib/base";
import "js-video-url-parser/lib/provider/youtube";

/** Pull the 11-character YouTube id out of a link or bare id, or null. */
export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = urlParser.parse(trimmed);
  if (parsed?.provider === "youtube" && parsed.id) {
    return parsed.id;
  }
  return null;
}

export function youtubeUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** 245 -> "4:05", 3725 -> "1:02:05" */
export function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = hrs > 0 ? String(mins).padStart(2, "0") : String(mins);
  return `${hrs > 0 ? `${hrs}:` : ""}${mm}:${String(secs).padStart(2, "0")}`;
}
