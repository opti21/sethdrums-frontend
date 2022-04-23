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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axios from "axios";
import { FC } from "react";
import PGButton from "./PgButton";
import { MdDragIndicator } from "react-icons/md";
import { IApiRequest, IAPiVideo, Status } from "../utils/types";
import { PG_Status } from "@prisma/client";
import { toast } from "react-toastify";
import { IoMdTrash } from "react-icons/io";
import { AiFillCrown, AiOutlineCrown } from "react-icons/ai";
import { usePGCheckerModalStore } from "../stateStore/modalState";

type Props = {
  id: string;
  request: IApiRequest;
  video: IAPiVideo;
  pgStatus?: PG_Status;
  openDeleteModal?: (request: any, video: any) => void;
  disabled?: boolean;
  numOfPrio?: number;
  sethView?: boolean;
  publicView?: boolean;
  user?: any;
};

const RequestCard: FC<Props> = ({
  id,
  request,
  video,
  pgStatus,
  openDeleteModal,
  disabled,
  numOfPrio,
  sethView,
  publicView,
  user,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: `sortable${id}`,
      // disabled: disabled,
    });

  const prioGradient = "linear(to-r, #7303c0, #C89416, #7303c0)";
  const regularGradient = "linear(to-r, #24243e, #302b63, #24243e)";
  const cardBG = request.priority ? prioGradient : regularGradient;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  const markNowPlaying = () => {
    axios
      .post("/api/mod/queue/nowPlaying", {
        requestID: id,
      })
      .then(async (res) => {
        if (res.status === 200) {
          toast.success("song now playing");
          await axios.post("/api/mod/trigger", {
            eventName: "update-queue",
            data: {},
          });
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error("Error setting now playing");
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
      ref={setNodeRef}
      style={style}
    >
      <Flex direction={["column", "row"]}>
        <Flex direction={"row"}>
          {!sethView && !publicView && (
            <Icon
              as={MdDragIndicator}
              w={10}
              h={100}
              {...attributes}
              {...listeners}
              mr={2}
              color="white"
            />
          )}
          <Stack alignItems={"center"} direction={["row", "column"]} pr={2}>
            <Image
              maxW={"100px"}
              rounded="lg"
              src={video.thumbnail}
              objectFit="cover"
              alt="video thumbnail"
              mt={2}
              style={{
                filter: "drop-shadow(0px 5px 3px rgba(0, 0, 0, 0.3))",
              }}
            />
            <Text
              fontSize={"xl"}
              style={{
                fontWeight: "bold",
                textShadow: "0px 2px 6px #000000",
                color: "white",
              }}
            >
              {formatDuration(video.duration)}
            </Text>
          </Stack>
        </Flex>
        <VStack align={"start"} w={"100%"}>
          <Link
            href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
            onClick={() => {
              if (sethView) {
                markNowPlaying();
              }
            }}
            fontSize={["md", "xl"]}
            style={{
              fontWeight: "bold",
              textShadow: "0px 2px 5px #000000",
              color: "white",
            }}
            noOfLines={2}
            p={1}
            isExternal
          >
            {video.title}
          </Link>

          <Text
            fontSize="md"
            style={{
              textShadow: "0px 1px 3px #000000",
              color: "white",
            }}
            p={0.5}
            isTruncated
          >
            Requested By: <b>{request.requested_by}</b>
          </Text>
        </VStack>
        <Stack direction={["row", "column"]} pt={2} spacing={2}>
          {!publicView && (
            <PGButton
              requestID={request.id}
              pgStatus={pgStatus}
              youtubeID={video.youtube_id}
              sethView={sethView ? sethView : false}
            />
          )}
          <HStack w={"100%"}>
            {!sethView &&
              !publicView &&
              (!request.priority ? (
                <Button
                  onClick={() => {
                    axios
                      .post(
                        `/api/mod/request/make-prio?requestID=${request.id}&newStatus=true`
                      )
                      .then(async (res) => {
                        if (res.status === 200) {
                          await axios.post("/api/mod/trigger", {
                            eventName: "update-queue",
                            data: {},
                          });
                          toast.success("Request marked Priority");
                        }
                      })
                      .catch((error) => {
                        toast.error("Error updating prio status");
                        console.error(error);
                      });
                  }}
                  bgColor={"gold"}
                  style={{ color: "black" }}
                  w={["100%", "75%"]}
                >
                  <Icon as={AiOutlineCrown} w={5} h={5} />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    axios
                      .post(
                        `/api/mod/request/make-prio?requestID=${request.id}&newStatus=false`
                      )
                      .then(async (res) => {
                        await axios.post("/api/mod/trigger", {
                          eventName: "update-queue",
                          data: {},
                        });
                      })
                      .catch((error) => {
                        toast.error("Error updating prio status");
                        console.error(error);
                      });
                  }}
                  bgColor={"gold"}
                  style={{ color: "black" }}
                  w={["100%", "75%"]}
                >
                  <Icon as={AiFillCrown} w={5} h={5} />
                </Button>
              ))}
            {typeof user != undefined && publicView
              ? user?.preferred_username === request.requested_by && (
                  <Button
                    onClick={() => {
                      openDeleteModal(request, video);
                    }}
                    bgColor={"#BD0000"}
                    w={"25%"}
                  >
                    <Icon as={IoMdTrash} w={5} h={5} />
                  </Button>
                )
              : !sethView && (
                  <Button
                    onClick={() => {
                      openDeleteModal(request, video);
                    }}
                    bgColor={"#BD0000"}
                    w={"25%"}
                  >
                    <Icon as={IoMdTrash} w={5} h={5} />
                  </Button>
                )}
          </HStack>
        </Stack>
      </Flex>
    </Box>
  );
};

export default RequestCard;
