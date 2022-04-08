import { useUser } from "@auth0/nextjs-auth0";
import {
  AspectRatio,
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
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axios from "axios";
import { FC } from "react";
import PGButton from "./PgButton";
import { MdDragIndicator } from "react-icons/md";
import { Status } from "../utils/types";

type Props = {
  id: string;
  request: any;
  video: any;
  pgStatus: any;
  cardBG: string;
  onPgDataChange: any;
  openPGModal: any;
  openDeleteModal: (request: any, video: any) => void;
  disabled: boolean;
};

const RequestCard: FC<Props> = ({
  id,
  request,
  video,
  pgStatus,
  cardBG,
  onPgDataChange,
  openPGModal,
  openDeleteModal,
  disabled,
}) => {
  if (!request) return null;
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: `${id}`,
      disabled: disabled,
    });
  const { user, error, isLoading } = useUser();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePGClick = async () => {
    if (pgStatus.status === Status.NotChecked) {
      await axios.put("/api/pg-status", {
        entityID: pgStatus,
        status: Status.BeingChecked,
      });

      await axios.post("/api/trigger", {
        channelName: "sethdrums-queue",
        eventName: "update-queue",
        data: {},
      });
    }
    onPgDataChange({
      video: {
        youtube_id: video.youtube_id,
      },
      pgStatus: { entityId: pgStatus.entityId },
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
        borderColor="pink.200"
        bgColor={cardBG}
        rounded="lg"
        w={"100%"}
        p={2}
        my={2}
        ref={setNodeRef}
        style={style}
      >
        <HStack>
          <Icon
            as={MdDragIndicator}
            w={6}
            h={6}
            {...attributes}
            {...listeners}
          />
          <Box>
            <Image
              maxW={"100px"}
              rounded="lg"
              src={request.video.thumbnail}
              objectFit="cover"
              alt="video thumbnail"
            />
          </Box>
          <Box flex={1} ml={{ md: 2 }}>
            <Text
              fontSize="xl"
              style={{
                fontWeight: "bold",
              }}
              noOfLines={1}
            >
              {request.video.title}
            </Text>
            <Text>{formatDuration(video.duration)}</Text>
            <Text fontSize="md" isTruncated>
              Requested By: {request.requested_by}
            </Text>
          </Box>
          <Flex pt={2}>
            <PGButton pgStatus={pgStatus} onClick={() => handlePGClick()} />
            <Popover>
              <PopoverTrigger>
                <Button>Actions</Button>
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
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </HStack>
      </Box>
    </>
  );
};

export default RequestCard;
