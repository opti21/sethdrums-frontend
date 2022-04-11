import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Image,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Stack,
  Text,
  useColorModeValue,
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

type Props = {
  id: string;
  request: IApiRequest;
  video: IAPiVideo;
  pgStatus: PG_Status;
  onPgDataChange: any;
  openPGModal: any;
  openDeleteModal: (request: any, video: any) => void;
  disabled: boolean;
  numOfPrio: number;
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
      channelName: "presence-sethdrums-queue",
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

  return (
    <>
      {/* <DeleteModal /> */}

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
        <Stack direction={["column", "row"]}>
          <Icon
            as={MdDragIndicator}
            w={10}
            h={10}
            {...attributes}
            {...listeners}
          />
          <Stack alignItems={"center"} direction={["row", "column"]}>
            <Image
              maxW={"100px"}
              rounded="lg"
              src={video.thumbnail}
              objectFit="cover"
              alt="video thumbnail"
            />
            <Text fontSize={"xl"} style={{ fontWeight: "bold" }}>
              {formatDuration(video.duration)}
            </Text>
          </Stack>
          <Box flex={1} ml={{ md: 2 }}>
            <Text
              fontSize={["md", "xl"]}
              style={{
                fontWeight: "bold",
              }}
              noOfLines={2}
            >
              {video.title}
            </Text>
            <Text fontSize="md" isTruncated>
              Requested By: {request.requested_by}
            </Text>
          </Box>
          <Flex pt={2}>
            <PGButton pgStatus={pgStatus} onClick={() => handlePGClick()} />
            <Popover>
              <PopoverTrigger>
                <Button px={8}>Actions</Button>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>Actions</PopoverHeader>
                <PopoverBody>
                  <Button
                    onClick={() => openDeleteModal(request, video)}
                    bgColor={"red"}
                    mx={2}
                    w={"25%"}
                  >
                    Delete
                  </Button>
                  {!request.priority ? (
                    <Button
                      onClick={() => {
                        axios
                          .post(
                            `/api/mod/request/make-prio?requestID=${request.id}&newStatus=true`
                          )
                          .then(async (res) => {
                            await axios.post("/api/mod/trigger", {
                              channelName: "presence-sethdrums-queue",
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
                      mx={2}
                      w={"30%"}
                    >
                      Make Prio
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
                              channelName: "presence-sethdrums-queue",
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
                      mx={2}
                      w={"40%"}
                    >
                      Remove Prio
                    </Button>
                  )}
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Stack>
      </Box>
    </>
  );
};

export default RequestCard;
