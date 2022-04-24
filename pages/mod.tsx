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
  Text,
  Stack,
  Avatar,
} from "@chakra-ui/react";
import axios from "axios";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import Nav from "../components/Nav";
import RequestCard from "../components/RequestCard";
import { IApiRequest, IQueue } from "../utils/types";
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
import { Status } from "@prisma/client";
import NowPlayingCard from "../components/NowPlayingCard";

type PGState = {
  youtubeID: string;
  pgStatusID: string;
  currentStatus: string;
};

const Mod: NextPage = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { user, error: userError, isLoading } = useUser();
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queue, setQueue] = useState<IQueue | null>(null);
  const [queueStatus, setQueueStatus] = useState<string>("loading");
  const [beingUpdatedBy, setBeingUpdatedBy] = useState<string>("");
  const [deleteModalData, setDeleteModalData] = useState<any>({
    request: null,
    video: null,
  });
  const [pgData, setPGData] = useState<PGState>({
    youtubeID: "",
    pgStatusID: "",
    currentStatus: "",
  });
  const [pusherConnected, setPusherConnected] = useState<boolean>(false);
  const [modsOnline, setModsOnline] = useState<any[]>([]);

  const disableDrag =
    queueStatus === "updating" && beingUpdatedBy !== user?.prefferred_username;

  useEffect(() => {
    if (!user) {
      return;
    }
    console.log("connect pusher");

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: "/api/pusher/auth",
    });

    let channel = pusher.subscribe(process.env.NEXT_PUBLIC_PUSHER_CHANNEL);

    if (!pusherConnected) {
      channel.bind("pusher:subscription_error", (error) => {
        console.error(error);
        if (error.status === 403) {
          setQueueError("Only mods and seth can access this page");
          return;
        }
      });

      channel.bind("pusher:subscription_succeeded", (members) => {
        console.log("succec");

        members.each((member) => {
          setModsOnline((currModsOnline) => [...currModsOnline, member]);
        });

        axios
          .get("/api/mod/queue")
          .then((res) => {
            setQueue(res.data);
            setQueueStatus("ready");
          })
          .catch((error) => {
            if (error.response.status === 401) {
              setQueueError("You are unauthorized please Sign In.");
              return;
            } else if (error.response.status === 403) {
              setQueueError("Only mods can access this");
              return;
            }

            setQueueError("Error Fetching queue");
            console.error(error);
          });
      });

      channel.bind("pusher:member_added", (member) => {
        console.log("mod joined");
        setModsOnline((currOnlineMods) => [...currOnlineMods, member]);
      });

      channel.bind("pusher:member_removed", (member) => {
        console.log("mod disconnected");
        setModsOnline((currOnlineMods) => {
          const updatedMods = currOnlineMods.filter((mod) => {
            return member.id != mod.id;
          });

          return [...updatedMods];
        });
      });

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

        axios
          .get("/api/mod/queue")
          .then((res) => {
            setQueue(res.data);
            setQueueStatus("ready");
            setBeingUpdatedBy("");
          })
          .catch((error) => {
            if (error.response.status === 401) {
              setQueueError("You are unauthorized please Sign In.");
              return;
            }
            console.error(error);
          });
        // console.log(data);
      });

      channel.bind("queue-add", (data: any) => {
        console.log("queue add");
        toast.info("New Request Added", {
          position: "bottom-center",
          pauseOnFocusLoss: false,
        });
        axios
          .get("/api/mod/queue")
          .then((res) => {
            if (res.status === 401) {
              setQueueError("You are unauthorized please Sign In.");
              return;
            }

            setQueue(res.data);
            setQueueStatus("ready");
          })
          .catch((error) => {
            if (error.response.status === 401) {
              setQueueError("You are unauthorized please Sign In.");
              return;
            }
            console.error(error);
          });
      });

      channel.bind("update-queue", (data: any) => {
        console.log("update queue");
        axios.get("/api/mod/queue").then((res) => {
          setQueue(res.data);
          setQueueStatus("ready");
        });
      });
      setPusherConnected(true);
    }

    return () => {
      pusher.disconnect();
    };
  }, [user]);

  // console.log(queue);

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

  const handlePGModalClose = (pgStatusID: string) => {
    axios
      .put("/api/mod/pg-status", {
        pgStatusID,
        status: pgData.currentStatus,
      })
      .then(async (res) => {
        console.log("pg updated");
        await axios.post("/api/mod/trigger", {
          eventName: "update-queue",
          data: {},
        });
        closePGModal();
        setPGData({
          youtubeID: "",
          pgStatusID: "",
          currentStatus: "",
        });
      });
  };

  const updatePG = (status: string, pgStatusID: string) => {
    try {
      console.log("update pg");
      axios
        .put("/api/mod/pg-status", {
          pgStatusID,
          status,
        })
        .then(async (res) => {
          console.log("pg updated");
          await axios.post("/api/mod/trigger", {
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
    const alreadyRequested = queue.order.findIndex((request) => {
      console.log(request);
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

  const validateRequestedBy = (value: string) => {
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

  const NotCountedAlert = () => {
    let numOfPGNotChecked = 0;
    const requestText =
      numOfPGNotChecked > 1 ? "requests need" : "request needs";

    for (let i = 0; i < queue?.order?.length; i++) {
      if (queue.order[i].Video.PG_Status.status === Status.NOT_CHECKED) {
        numOfPGNotChecked += 1;
      }
    }

    if (queue.order.length > 0 && numOfPGNotChecked > 0) {
      return (
        <Alert mt={2} status="warning">
          <AlertIcon />
          {numOfPGNotChecked} {requestText} to be checked for PG status
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

  const numOfPrio = queue?.order.filter((request) => {
    request.priority === true;
  }).length;

  return (
    <>
      <Head>
        <title>Mod Panel</title>
        <meta name="description" content="Mod Panel" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/mod" />

        <Modal isOpen={isAddModalOpen} onClose={closeAddModal} size="2xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Video</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Formik
                initialValues={{ ytLink: "", requestedBy: "" }}
                onSubmit={(values, actions) => {
                  axios
                    .post("/api/mod/request", values)
                    .then(async (res) => {
                      // console.log(res.data);
                      if (res.status === 200) {
                        await axios.post("/api/mod/trigger", {
                          eventName: "update-queue",
                          data: { beingUpdatedBy: user?.preferred_username },
                        });
                        closeAddModal();
                        toast.success("Request added");
                      }
                    })
                    .catch((error) => {
                      console.error(error);
                      toast.error("Error submitting request");
                      actions.setSubmitting(false);
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
                      name="requestedBy"
                      validate={validateRequestedBy}
                    >
                      {({ field, form }: any) => (
                        <FormControl
                          isInvalid={
                            form.errors.requestedBy && form.touched.requestedBy
                          }
                          isRequired={true}
                        >
                          <FormLabel mt={4} htmlFor="requested-by">
                            Requested By
                          </FormLabel>

                          <Input
                            {...field}
                            id="requested-by"
                            placeholder="username"
                          />
                          <FormErrorMessage>
                            {form.errors.requestedBy}
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

        <Modal
          isOpen={isPGModalOpen}
          onClose={() => handlePGModalClose(pgData.pgStatusID)}
          size="2xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>PG Status Checker</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <AspectRatio maxW="100%" ratio={16 / 9}>
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${pgData.youtubeID}`}
                  height={"100%"}
                  width={"100%"}
                  controls={true}
                />
              </AspectRatio>
              <HStack pt="4">
                <Button
                  onClick={() => updatePG("PG", pgData.pgStatusID)}
                  bgColor="green"
                  w="100%"
                >
                  PG
                </Button>
                <Button
                  onClick={() => updatePG("NON_PG", pgData.pgStatusID)}
                  bgColor="red"
                  w="100%"
                >
                  NON PG
                </Button>
                <Button
                  onClick={() => updatePG("NON_PG", pgData.pgStatusID)}
                  w="25%"
                  colorScheme={"red"}
                  variant={"link"}
                >
                  BAN
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

        {queueError && (
          <Alert mt={2} status="error">
            {queueError}
          </Alert>
        )}
        {!user && !isLoading && (
          <Alert mt={2} status="error">
            You must be signed in and a mod to access this page
          </Alert>
        )}
        {!queueError &&
          user &&
          (queue ? (
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
                      return `sortable${request.id}`;
                    })!
                  }
                  strategy={verticalListSortingStrategy}
                >
                  <Stack direction={"row"} pt={5}>
                    <Box px={[4, 5]} w={["100%", "80%"]}>
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
                      <Button my={2} onClick={openAddModal}>
                        Add Request
                      </Button>
                      <QueueStatus />
                      <NotCountedAlert />
                      {queue?.order.map((request) => {
                        return (
                          <RequestCard
                            key={`key${request.id}`}
                            id={request.id}
                            request={request}
                            video={request.Video}
                            pgStatus={request.Video.PG_Status}
                            onPgDataChange={setPGData}
                            openPGModal={openPGModal}
                            openDeleteModal={handleDeleteModalOpen}
                            disabled={disableDrag}
                            numOfPrio={numOfPrio}
                            user={user}
                          />
                        );
                      })}
                    </Box>
                    <Box display={["none", "block"]} w={"20%"} ml={2}>
                      <Text as={"u"} fontSize={"2xl"} fontWeight={"bold"}>
                        Mods Online
                      </Text>
                      <Box>
                        {modsOnline.map((mod) => {
                          return (
                            <HStack key={mod.id} my={2}>
                              <Avatar src={mod.info.picture} />
                              <Text>{mod.info.username}</Text>
                            </HStack>
                          );
                        })}
                      </Box>
                    </Box>
                  </Stack>
                </SortableContext>
                <DragOverlay>
                  {activeId ? <DragItem id={activeId} /> : null}
                </DragOverlay>
              </DndContext>
            </>
          ) : (
            <Box w={"100%"} alignContent="center">
              <Text>Loading Queue...</Text>
              <Image
                src="/loading.gif"
                alt="loading seth's huge forehead"
                width={384}
                height={96}
              />
            </Box>
          ))}
      </Container>
    </>
  );
};

export default Mod;
