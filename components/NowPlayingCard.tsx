import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { FC } from "react";
import PGButton from "./PgButton";
import { IApiRequest, IAPiVideo, Status } from "../utils/types";
import { PG_Status } from "@prisma/client";
import { toast } from "react-toastify";

type Props = {
  request: IApiRequest;
  video: IAPiVideo;
  pgStatus?: PG_Status;
  sethView?: boolean;
  publicView?: boolean;
  user?: any;
};

const NowPlayingCard: FC<Props> = ({
  request,
  video,
  pgStatus,
  sethView,
  publicView,
}) => {
  if (!request) return null;
  const prioGradient = "linear(to-r, #7303c0, #C89416, #7303c0)";

  const regularGradient = "linear(to-r, #24243e, #302b63, #24243e)";

  const cardBG = request.priority ? prioGradient : regularGradient;

  const formatDuration = (duration: number) => {
    let hrs = ~~(duration / 3600);
    let mins = ~~((duration % 3600) / 60);
    let secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    let formatted = "";
    if (hrs > 0) {
      formatted += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }
    formatted += "" + mins + ":" + (secs < 10 ? "0" : "");
    formatted += "" + secs;

    return formatted;
  };

  const markAsPlayed = () => {
    axios
      .put("/api/mod/request", { requestID: request.id, played: true })
      .then(async (res) => {
        if (res.status === 200) {
          toast.success("Request marked as played!");
          // Clear now playing
          await axios
            .delete("/api/mod/queue/nowPlaying")
            .then((nowPlayingRes) => {
              if (nowPlayingRes.status === 200) {
                axios
                  .post("/api/mod/trigger", {
                    eventName: "update-queue",
                    data: {},
                  })
                  .catch((triggerErr) => {
                    console.error(triggerErr);
                    toast.error("Error triggering pusher");
                  });
              }
            })
            .catch((err) => {
              console.error(err);
              toast.error("Error clearing now playing");
            });
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error marking request as played");
      });
  };

  return (
    <Box
      border="1px"
      borderColor={request.priority ? "orange.300" : "purple.700"}
      bgGradient={cardBG}
      rounded="lg"
      w={"100%"}
      p={2}
      my={2}
    >
      <Flex direction={["column", "row"]}>
        <Flex direction={"row"}>
          <Stack alignItems={"center"} direction={["row", "column"]} pr={2}>
            <Image
              maxW={"100px"}
              rounded="lg"
              src={video.thumbnail}
              objectFit="cover"
              alt="video thumbnail"
              mt={2}
            />
            <Text
              fontSize={"xl"}
              style={{ fontWeight: "bold", textShadow: "0px 2px 6px #000000" }}
            >
              {formatDuration(video.duration)}
            </Text>
          </Stack>
        </Flex>
        <VStack align={"start"} w={"100%"}>
          <Link
            href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
            fontSize={["md", "xl"]}
            style={{
              fontWeight: "bold",
              textShadow: "0px 2px 5px #000000",
            }}
            padding={1}
            noOfLines={2}
            isExternal
          >
            {video.title}
          </Link>
          <Text
            fontSize="lg"
            style={{
              textShadow: "0px 1px 3px #000000",
            }}
            padding={0.5}
            isTruncated
          >
            Requested By: <b>{request.requested_by}</b>
          </Text>
        </VStack>
        <Stack direction={["row", "column"]} pt={2} spacing={2}>
          {!publicView && (
            <PGButton
              pgStatus={pgStatus}
              onClick={() => {}}
              sethView={sethView ? sethView : false}
              width={"100%"}
            />
          )}
          {sethView && (
            <>
              <Button
                onClick={() => markAsPlayed()}
                w={"100%"}
                colorScheme={"blue"}
              >
                Mark Played
              </Button>
              <Button
                h={[10, 5]}
                w={"100%"}
                fontSize={[15, 10]}
                colorScheme={"blue"}
              >
                Return to Queue
              </Button>
            </>
          )}
        </Stack>
      </Flex>
    </Box>
  );
};

export default NowPlayingCard;