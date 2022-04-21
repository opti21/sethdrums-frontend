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

type Props = {
  id: string;
  request: IApiRequest;
  video: IAPiVideo;
  pgStatus?: PG_Status;
  onPgDataChange?: any;
  openPGModal?: any;
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
  onPgDataChange,
  openPGModal,
  openDeleteModal,
  disabled,
  numOfPrio,
  sethView,
  publicView,
  user,
}) => {
  if (!request) return null;
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: `sortable${id}`,
      // disabled: disabled,
    });
  const cardBG = request.priority
    ? useColorModeValue("yellow.300", "yellow.500")
    : useColorModeValue("pink", "pink.900");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePGClick = async () => {
    onPgDataChange({
      youtubeID: video.youtube_id,
      pgStatusID: pgStatus.id,
      currentStatus: pgStatus.status,
    });

    await axios.put("/api/mod/pg-status", {
      pgStatusID: pgStatus.id,
      status: Status.BeingChecked,
    });

    await axios.post("/api/mod/trigger", {
      eventName: "update-queue",
      data: {},
    });
    openPGModal();
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
  const test = typeof user != undefined;
  console.log(test);

  return (
    <>
      <Box
        border="1px"
        borderColor={request.priority ? "yellow.100" : "pink.200"}
        bgColor={cardBG}
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
              />
              <Text fontSize={"xl"} style={{ fontWeight: "bold" }}>
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
              }}
              noOfLines={2}
              isExternal
            >
              {video.title}
            </Link>
            <Text fontSize="md" isTruncated>
              Requested By: {request.requested_by}
            </Text>
          </VStack>
          <Stack direction={["row", "column"]} pt={2} spacing={2}>
            {!publicView && (
              <PGButton
                pgStatus={pgStatus}
                onClick={() => handlePGClick()}
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
                      onClick={() => openDeleteModal(request, video)}
                      bgColor={"red"}
                      w={"25%"}
                    >
                      <Icon as={IoMdTrash} w={5} h={5} />
                    </Button>
                  )
                : !sethView && (
                    <Button
                      onClick={() => openDeleteModal(request, video)}
                      bgColor={"red"}
                      w={"25%"}
                    >
                      <Icon as={IoMdTrash} w={5} h={5} />
                    </Button>
                  )}
            </HStack>
          </Stack>
        </Flex>
      </Box>
    </>
  );
};

export default RequestCard;
