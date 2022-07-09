import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";

export function parseYTDuration(duration: string): number {
  const match = duration.match(/P(\d+Y)?(\d+W)?(\d+D)?T(\d+H)?(\d+M)?(\d+S)?/);
  // An invalid case won't crash the app.
  if (!match) {
    console.error(`Invalid YouTube video duration: ${duration}`);
    return 0;
  }
  const [years, weeks, days, hours, minutes, seconds] = match
    .slice(1)
    .map((_) => (_ ? parseInt(_.replace(/\D/, "")) : 0));
  return (
    (((years * 365 + weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 +
    seconds
  );
}

export const validateYTUrl = (value: string, queue: any) => {
  let error;
  const parsed = urlParser.parse(value);
  const alreadyRequested = queue.order.findIndex((request) => {
    return request.Video.youtube_id === parsed?.id;
  });

  if (!value) {
    error = "Youtube link required";
  } else if (!parsed) {
    error = "Not valid youtube URL";
  } else if (alreadyRequested != -1) {
    error = "Video is already in the queue";
  }

  return error;
};
