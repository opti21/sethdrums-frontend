import { useUser } from "@auth0/nextjs-auth0";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  useDisclosure,
  Link as ChakraLink,
} from "@chakra-ui/react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Video } from "@prisma/client";
import axios from "axios";
import { Field, Form, Formik, FormikProps } from "formik";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import Link from "next/link";
import { FC, useState } from "react";
import { toast } from "react-toastify";
import { IApiRequest, IQueue, Status } from "../utils/types";
import AddModal from "./modals/AddModal";
import DeleteModal from "./modals/DeleteModal";
import { useAddRequestModalStore } from "../stateStore/modalState";
import { useModQueueStore } from "../stateStore/queueState";
import NowPlayingCard from "./NowPlayingCard";
import RequestCard from "./RequestCard";
import DragItem from "./DragItem";

type Props = {};

const ModQueue: FC<Props> = ({}) => {
  const { user, error: userError, isLoading } = useUser();
  const [clearQueueLoading, setClearQueueLoading] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<any>({
    request: null,
    video: null,
  });

  const queue = useModQueueStore((state) => state.queue);
  const setQueue = useModQueueStore((state) => state.setQueue);
  const queueStatus = useModQueueStore((state) => state.queueStatus);
  const beingUpdatedBy = useModQueueStore((state) => state.beingUpdatedBy);
  const openAddModal = useAddRequestModalStore((state) => state.open);
  const activeId = useModQueueStore((state) => state.activeId);
  const setActiveId = useModQueueStore((state) => state.setActiveId);

  const disableDrag =
    queueStatus === "updating" && beingUpdatedBy !== user?.prefferred_username;

  const QueueStatus = () => {
    switch (queueStatus) {
      case "ready":
        return (
          <Alert status="info">
            <AlertIcon />
            Suggestion List is up to date
          </Alert>
        );
      case "updating":
        return (
          <Alert status="warning">
            <AlertIcon />
            {beingUpdatedBy === user?.preferred_username
              ? "You're "
              : beingUpdatedBy + ` is `}
            updating the suggestion list
          </Alert>
        );
      default:
        return (
          <Alert status="warning">
            <AlertIcon />
            Loading
          </Alert>
        );
    }
  };

  const NotCountedAlert = () => {
    let numOfPGNotChecked = 0;
    const requestText =
      numOfPGNotChecked > 1 ? "requests need" : "request needs";

    for (let i = 0; i < queue?.order?.length; i++) {
      if (queue.order[i].Video.PG_Status.status === Status.NotChecked) {
        numOfPGNotChecked += 1;
      }
    }

    if (queue.order.length > 0 && numOfPGNotChecked > 0) {
      return (
        <Alert mt={2} status="warning">
          <AlertIcon />
          <ChakraLink
            onClick={() =>
              window.scroll({
                top: document.body.offsetHeight,
                left: 0,
                behavior: "smooth",
              })
            }
          >
            {numOfPGNotChecked} {requestText} to be checked for PG status
          </ChakraLink>
        </Alert>
      );
    }
    return null;
  };

  const handleDeleteModalOpen = (request: any, video: any) => {
    setDeleteModalData({
      request,
      video,
    });
    openDeleteModal();
  };

  const clearNonPrio = () => {
    setClearQueueLoading(true);
    axios
      .post("/api/mod/queue/clearQueue")
      .then(async (res) => {
        if (res.status === 200) {
          await axios.post("/api/mod/trigger", {
            eventName: "update-queue",
            data: {},
          });
          toast.success("Non-prio requests cleared");
          setClearQueueLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error clearing non-prio requests");
        setClearQueueLoading(false);
      });
  };

  const onDragStart = async (event: any) => {
    console.log("Drag Started");
    const { active } = event;

    setActiveId(active.id);
    await axios.post("/api/mod/trigger", {
      eventName: "lock-queue",
      data: { beingUpdatedBy: user?.preferred_username },
    });
  };

  const reorder = (
    list: IApiRequest[],
    startIndex: number,
    endIndex: number
  ) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  const unlockQueue = async () => {
    console.log("unlock queue");
    await axios.post("/api/mod/trigger", {
      eventName: "unlock-queue",
      data: { beingUpdatedBy: "" },
    });
  };

  const onDragEnd = async (event: any) => {
    if (!queue) {
      unlockQueue();
      return;
    }
    if (!queue.order) {
      unlockQueue();
      return;
    }

    const { active, over } = event;
    if (!over) {
      unlockQueue();
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = queue.order.findIndex(
        (request) => `sortable${request.id}` === active.id
      );
      const newIndex = queue.order.findIndex(
        (request) => `sortable${request.id}` === over.id
      );

      const updatedOrder = reorder(queue.order, oldIndex, newIndex);
      const newQueue = { ...queue, order: updatedOrder };

      setQueue(newQueue);

      axios
        .post("/api/mod/queue", {
          updatedOrder,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success("Queue updated");
          }
        })
        .catch((err) => {
          console.error(err);
        });

      unlockQueue();
    }

    unlockQueue();
    setActiveId(null);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onClose: closeDeleteModal,
  } = useDisclosure();

  return (
    <>
      <AddModal queue={queue} />

      <DeleteModal />

      <Box width={"100%"}>
        <Text as={"u"} fontSize={"2xl"} fontWeight={"bold"}>
          Now Playing
        </Text>
        {queue.now_playing ? (
          <NowPlayingCard
            request={queue.now_playing}
            video={queue.now_playing.Video}
            pgStatus={queue.now_playing.Video.PG_Status}
          />
        ) : (
          <Container
            my={2}
            p={2}
            h={100}
            borderWidth="1px"
            borderRadius="lg"
            maxW={"100%"}
            centerContent
          >
            <Box mt={6}>
              <Text>Nothing playing</Text>
            </Box>
          </Container>
        )}
      </Box>
      <HStack>
        <Button my={2} onClick={openAddModal}>
          Add Suggestion
        </Button>
        <Popover placement="top">
          <PopoverTrigger>
            <Button colorScheme={"red"} variant={"ghost"} p={2} ml={2}>
              Clear Non-Prio
            </Button>
          </PopoverTrigger>
          <PopoverContent color="white" bg="red.900">
            <PopoverArrow bg="red.900" />
            <PopoverCloseButton />
            <PopoverHeader>
              Are you sure you want to clear the non-prio suggestions?
            </PopoverHeader>
            <PopoverBody>
              <Button
                my={2}
                onClick={() => {
                  clearNonPrio();
                }}
                colorScheme="red"
                w="100%"
                isLoading={clearQueueLoading}
              >
                CLEAR NON-PRIO
              </Button>
            </PopoverBody>
          </PopoverContent>
        </Popover>
        <Link passHref href={"/mod/banned-videos"}>
          <ChakraLink fontWeight={"medium"} ml={2}>
            Banned Videos
          </ChakraLink>
        </Link>
      </HStack>
      <QueueStatus />
      <NotCountedAlert />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={
            queue?.order.map((request) => {
              return `sortable${request.id}`;
            })!
          }
          strategy={verticalListSortingStrategy}
        >
          {queue.order.length > 0 ? (
            queue?.order.map((request) => {
              return (
                <RequestCard
                  key={`key${request.id}`}
                  id={request.id}
                  request={request}
                  video={request.Video}
                  pgStatus={request.Video.PG_Status}
                  openDeleteModal={handleDeleteModalOpen}
                  disabled={disableDrag}
                  user={user}
                />
              );
            })
          ) : (
            <Box w={"100%"} textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">
                No Requests In Suggestion List
              </Text>
            </Box>
          )}
        </SortableContext>
        <DragOverlay>
          {activeId ? <DragItem id={activeId} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export default ModQueue;
