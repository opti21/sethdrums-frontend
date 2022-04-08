import {
  Container,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  AspectRatio,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import axios from "axios";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import Nav from "../components/Nav";
import RequestCard from "../components/RequestCard";
import { IApiRequest, IQueue } from "../utils/types";
// import { useChannel, useEvent, useTrigger } from "@harelpls/use-pusher";
import { DragDropContext, Droppable, Draggable } from "@react-forked/dnd";
import { Video } from "../redis/handlers/Video";
import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import ReactPlayer from "react-player";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Field, Form, Formik, FormikProps } from "formik";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import { useUser } from "@auth0/nextjs-auth0";
import { toast } from "react-toastify";
import DragItem from "../components/DragItem";
import DeleteModal from "../components/modals/DeleteModal";
import Pusher from "pusher-js";
import Image from "next/image";

const Mod: NextPage = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { user, error, isLoading } = useUser();
  const [queue, setQueue] = useState<IQueue | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<string>("loading");
  const [beingUpdatedBy, setBeingUpdatedBy] = useState<string>("");
  const [deleteModalData, setDeleteModalData] = useState<any>({
    request: null,
    video: null,
  });
  const [pgData, setPGData] = useState<any>({
    video: {
      youtube_id: "",
    },
    pgStatus: {
      entityId: "",
    },
  });

  const disableDrag =
    queueStatus === "updating" && beingUpdatedBy !== user?.prefferred_username;

  const cardBG = useColorModeValue("pink", "pink.900");

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe("sethdrums-queue");

    channel.bind("lock-queue", (data: any) => {
      console.log("LOCKL QUEUE");
      setQueueStatus("updating");
      setBeingUpdatedBy(data.beingUpdatedBy);
      // console.log(data);
    });

    channel.bind("unlock-queue", (data: any) => {
      console.log("UNLOCKL QUEUE");
      if (beingUpdatedBy === user?.preferred_username) {
        setQueueStatus("ready");
        setBeingUpdatedBy("");
        return;
      }

      axios.get("/api/queue").then((res) => {
        setQueue(res.data);
        setQueueStatus("ready");
        setBeingUpdatedBy("");
      });
      // console.log(data);
    });

    channel.bind("queue-add", (data: any) => {
      console.log("queue add");
      axios.get("/api/queue").then((res) => {
        setQueue(res.data);
        setQueueStatus("ready");
      });
    });

    channel.bind("update-queue", (data: any) => {
      console.log("update queue");
      axios.get("/api/queue").then((res) => {
        setQueue(res.data);
        setQueueStatus("ready");
      });
    });

    pusher.connection.bind("connected", () => {
      axios.get("/api/queue").then((res) => {
        setQueue(res.data);
        setQueueStatus("ready");
      });
    });

    return () => {
      pusher.disconnect();
    };
  }, []);

  // console.log(queue);

  const onDragStart = async (event: any) => {
    // console.log("Drag Started");
    const { active } = event;

    setActiveId(active.id);
    await axios.post("/api/trigger", {
      channelName: "sethdrums-queue",
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
    await axios.post("/api/trigger", {
      channelName: "sethdrums-queue",
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
      // console.log(active.id, over.id);
      const oldIndex = queue.order.findIndex(
        (request) => request.id === active.id
      );
      const newIndex = queue.order.findIndex(
        (request) => request.id === over.id
      );
      const updatedOrder = reorder(queue.order, oldIndex, newIndex);
      const newQueue = { ...queue, order: updatedOrder };

      setQueue(newQueue);

      axios
        .post("/api/queue", {
          updatedOrder,
        })
        .then((res) => {
          // console.log(res);
        })
        .catch((err) => {
          console.error(err);
        });

      unlockQueue();
    }

    unlockQueue();
    setActiveId(null);
  };

  // console.log(queue);

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

  // Modals
  const {
    isOpen: isAddModalOpen,
    onClose: closeAddModal,
    onOpen: openAddModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onClose: closeDeleteModal,
  } = useDisclosure();
  const {
    isOpen: isPGModalOpen,
    onClose: closePGModal,
    onOpen: openPGModal,
  } = useDisclosure();

  const handlePGModalClose = (entityId: string) => {
    closePGModal();
  };

  const updatePG = (status: string, entityId: string) => {
    try {
      console.log("update pg");
      axios
        .put("/api/pg-status", {
          entityID: entityId,
          status,
        })
        .then(async (res) => {
          console.log("pg updated");
          await axios.post("/api/trigger", {
            channelName: "sethdrums-queue",
            eventName: "update-queue",
            data: {},
          });
          closePGModal();
        });
    } catch (error) {
      console.error(error);
    }
  };

  const validateYTUrl = (value: string) => {
    let error;
    const parsed = urlParser.parse(value);
    if (!value) {
      error = "Youtube link required";
    } else if (!parsed) {
      error = "Not valid youtube URL";
    }

    return error;
  };

  const validateSubmittedBy = (value: string) => {
    let error;

    if (!value) {
      error = "Name required";
    }

    return error;
  };

  const QueueStatus = () => {
    switch (queueStatus) {
      case "ready":
        return (
          <Alert status="info">
            <AlertIcon />
            Queue is up to date
          </Alert>
        );
      case "updating":
        return (
          <Alert status="warning">
            <AlertIcon />
            {beingUpdatedBy === user?.preferred_username
              ? "You're "
              : beingUpdatedBy + ` is `}
            updating the queue
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

  const handleDeleteModalOpen = (request: any, video: any) => {
    setDeleteModalData({
      request,
      video,
    });
    openDeleteModal();
  };

  return (
    <>
      <Head>
        <title>Mod Panel</title>
        <meta name="description" content="Mod Panel" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav />

        <Modal isOpen={isAddModalOpen} onClose={closeAddModal} size="2xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Video</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Formik
                initialValues={{ ytLink: "", submittedBy: "" }}
                onSubmit={(values, actions) => {
                  axios.post("/api/request", values).then(async (res) => {
                    // console.log(res.data);
                    if (res.status === 200) {
                      await axios.post("/api/trigger", {
                        channelName: "sethdrums-queue",
                        eventName: "update-queue",
                        data: { beingUpdatedBy: user?.preferred_username },
                      });
                      closeAddModal();
                      toast.success("Request added");
                    }
                  });
                }}
              >
                {(props: FormikProps<any>) => (
                  <Form>
                    <Field name="ytLink" validate={validateYTUrl}>
                      {({ field, form }: any) => (
                        <FormControl
                          isInvalid={form.errors.ytLink && form.touched.ytLink}
                          isRequired={true}
                        >
                          <FormLabel htmlFor="youtube-link">
                            Youtube Link
                          </FormLabel>

                          <Input
                            {...field}
                            id="youtube-link"
                            placeholder="https://www.youtube.com/watch?v=ECSNqKsY_T4"
                          />
                          <FormErrorMessage>
                            {form.errors.ytLink}
                          </FormErrorMessage>
                        </FormControl>
                      )}
                    </Field>
                    <Field
                      mb={2}
                      name="submittedBy"
                      validate={validateSubmittedBy}
                    >
                      {({ field, form }: any) => (
                        <FormControl
                          isInvalid={
                            form.errors.submittedBy && form.touched.submittedBy
                          }
                          isRequired={true}
                        >
                          <FormLabel mt={4} htmlFor="submitted-by">
                            Submitted By
                          </FormLabel>

                          <Input
                            {...field}
                            id="submitted-by"
                            placeholder="username"
                          />
                          <FormErrorMessage>
                            {form.errors.name}
                          </FormErrorMessage>
                        </FormControl>
                      )}
                    </Field>
                    <AspectRatio mt={4} maxW="100%" ratio={16 / 9}>
                      <ReactPlayer
                        url={props.values.ytLink}
                        height={"100%"}
                        width={"100%"}
                        controls={true}
                      />
                    </AspectRatio>
                    <Button
                      mt={4}
                      mb={2}
                      colorScheme="teal"
                      isLoading={props.isSubmitting}
                      type="submit"
                    >
                      Submit
                    </Button>
                  </Form>
                )}
              </Formik>
            </ModalBody>
          </ModalContent>
        </Modal>

        <Modal isOpen={isPGModalOpen} onClose={closePGModal} size="2xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>PG Status Checker</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <AspectRatio maxW="100%" ratio={16 / 9}>
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${pgData.video.youtube_id}`}
                  height={"100%"}
                  width={"100%"}
                  controls={true}
                />
              </AspectRatio>
              <HStack pt="4">
                <Button
                  onClick={() => updatePG("PG", pgData.pgStatus.entityId)}
                  bgColor="green"
                  w="100%"
                >
                  PG
                </Button>
                <Button
                  onClick={() => updatePG("NON_PG", pgData.pgStatus.entityId)}
                  bgColor="red"
                  w="100%"
                >
                  NON PG
                </Button>
              </HStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        <DeleteModal
          isDeleteModalOpen={isDeleteModalOpen}
          closeDeleteModal={closeDeleteModal}
          deleteModalData={deleteModalData}
          setDeleteModalData={setDeleteModalData}
        />

        {queue ? (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={
                  queue?.order.map((request) => {
                    return request.id;
                  })!
                }
                strategy={verticalListSortingStrategy}
              >
                <Box p="10">
                  <Button my={2} onClick={openAddModal}>
                    Add Request
                  </Button>
                  <QueueStatus />
                  {queue?.order.map((request) => {
                    return (
                      <RequestCard
                        key={request.id}
                        id={request.id}
                        request={request}
                        video={request.video}
                        cardBG={cardBG}
                        pgStatus={request.pgStatus}
                        onPgDataChange={setPGData}
                        openPGModal={openPGModal}
                        openDeleteModal={handleDeleteModalOpen}
                        disabled={disableDrag}
                      />
                    );
                  })}
                </Box>
              </SortableContext>
              <DragOverlay>
                {activeId ? <DragItem id={activeId} /> : null}
              </DragOverlay>
            </DndContext>
          </>
        ) : (
          <Box w={"100%"} alignContent="center">
            <Image
              src="/loading.gif"
              alt="loading seth's huge head"
              width={384}
              height={96}
            />
          </Box>
        )}
      </Container>
    </>
  );
};

export default Mod;
