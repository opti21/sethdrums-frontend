import {
  Container,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
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
  Text,
  Stack,
  StackDivider,
  AlertIcon,
  HStack,
  Avatar,
  Divider,
} from "@chakra-ui/react";
import axios from "axios";
import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import RequestCard from "../components/RequestCard";
import { IQueue } from "../utils/types";
import ReactPlayer from "react-player";
import { Field, Form, Formik, FormikProps } from "formik";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import { useUser } from "@auth0/nextjs-auth0";
import { toast } from "react-toastify";
import Pusher from "pusher-js";
import Image from "next/image";
import NowPlayingCard from "../components/NowPlayingCard";

const SethView: NextPage = () => {
  const { user, error: userError, isLoading } = useUser();
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queue, setQueue] = useState<IQueue | null>(null);
  const [queueStatusData, setQueueStatus] = useState<string>("loading");
  const [beingUpdatedBy, setBeingUpdatedBy] = useState<string>("");
  const [pusherConnected, setPusherConnected] = useState<boolean>(false);
  const [modsOnline, setModsOnline] = useState<any[]>([]);

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

  const QueueStatus = () => {
    switch (queueStatusData) {
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

  const validateYTUrl = (value: string) => {
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

  const validateRequestedBy = (value: string) => {
    let error;

    if (!value) {
      error = "Name required";
    }

    return error;
  };

  // Modals
  const {
    isOpen: isAddModalOpen,
    onClose: closeAddModal,
    onOpen: openAddModal,
  } = useDisclosure();

  const numOfPrio = queue?.order.filter((request) => {
    request.priority === true;
  }).length;

  return (
    <>
      <Head>
        <title>Seth View</title>
        <meta name="description" content="Seth View" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/seth" />

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
                        sethView={true}
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
                  {queue?.order.map((request) => {
                    return (
                      <RequestCard
                        key={`key${request.id}`}
                        id={request.id}
                        request={request}
                        video={request.Video}
                        pgStatus={request.Video.PG_Status}
                        sethView={true}
                        numOfPrio={numOfPrio}
                      />
                    );
                  })}
                </Box>
                <Box display={["none", "block"]} w={"20%"} ml={2}>
                  <Text as={"u"} fontSize={"2xl"} fontWeight={"bold"}>
                    Mods Online
                  </Text>
                  {modsOnline.length > 0 && (
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
                  )}
                </Box>
              </Stack>
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

export default SethView;
