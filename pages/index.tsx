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
  Link as ChakraLink,
} from "@chakra-ui/react";
import axios from "axios";
import { NextPage } from "next";
import Head from "next/head";
import Nav from "../components/Nav";
import RequestCard from "../components/RequestCard";
import ReactPlayer from "react-player";
import { Field, Form, Formik, FormikProps } from "formik";
import { useUser } from "@auth0/nextjs-auth0";
import { toast } from "react-toastify";
import Image from "next/image";
import { IoLogoTwitch } from "react-icons/io";
import useSWR from "swr";
import Link from "next/link";
import DeleteModal from "../components/modals/DeleteModal";
import NowPlayingCard from "../components/NowPlayingCard";
import ScrollToTop from "react-scroll-to-top";
import { ArrowUpIcon } from "@chakra-ui/icons";
import { validateYTUrl } from "../utils/utils";

const Home: NextPage = () => {
  const { user, error: userError, isLoading } = useUser();
  const {
    data: queue,
    error: queueError,
    mutate,
  } = useSWR("/api/public/queue");

  // Modals
  const {
    isOpen: isAddModalOpen,
    onClose: closeAddModal,
    onOpen: openAddModal,
  } = useDisclosure();

  const handleAddModalOpen = () => {
    mutate();
    const alreadyRequested = queue.order.findIndex((request) => {
      return request.requested_by === user.preferred_username;
    });
    if (alreadyRequested != -1) {
      toast.error("You already have a request in the queue");
      return;
    }

    openAddModal();
  };

  return (
    <>
      <Head>
        <title>SethDrums Song Panel</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="og:title" content="SethDrums Song Panel - Home" />
        <meta name="og:site_name" content="SethDrums Song Panel" />
        <meta
          name="og:description"
          content="Song Panel to suggest a song for SethDrums' stream."
        />
        <meta
          name="og:image"
          content="https://sethdrums.com/SethDrums_Twitter_2022-min.jpg"
        />
        <meta name="twitter:creator" content="@imSethDrums" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://sethdrums.com/SethDrums_Twitter_2022-min.jpg"
        />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/" />

        <Modal
          id="public-add-request-modal"
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          size="2xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Video</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Formik
                initialValues={{
                  ytLink: "",
                }}
                enableReinitialize={true}
                onSubmit={(values, actions) => {
                  axios
                    .post("/api/public/request", {
                      ytLink: values.ytLink,
                    })
                    .then(async (res) => {
                      actions.setSubmitting(false);
                      if (res.status === 200) {
                        mutate();
                        closeAddModal();
                        toast.success("Request added");
                      }
                    })
                    .catch((error) => {
                      actions.setSubmitting(false);
                      toast.error(error.response.data.error);
                      console.error(error.response.data);
                      return;
                    });
                }}
              >
                {(props: FormikProps<any>) => (
                  <Form>
                    <Field
                      name="ytLink"
                      validate={(value) => validateYTUrl(value, queue)}
                    >
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
                      id="public-submit-request-btn"
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

        <DeleteModal publicView={true} />

        <ScrollToTop
          smooth
          style={{ backgroundColor: "Background" }}
          component={<ArrowUpIcon color="white" />}
        />

        {queueError && (
          <Alert mt={2} status="error">
            Error fetching Suggestion List
          </Alert>
        )}
        {!queueError &&
          (queue ? (
            <Stack direction={["column", "row"]} pt={5}>
              {queue.is_open ? (
                <Box px={[4, 5]} w={["100%", "50%"]}>
                  <Box
                    rounded="lg"
                    bgColor={
                      queue?.is_paused
                        ? "yellow.500"
                        : queue?.is_open
                          ? "green.500"
                          : "red.700"
                    }
                    textAlign="center"
                    p={2}
                  >
                    <Text fontWeight="bold">
                      Suggestion List is {queue?.is_paused ? "Paused" : queue?.is_open ? "Open" : "Closed"}
                    </Text>
                  </Box>
                  <Box width={"100%"}>
                    <Text as={"u"} fontSize={"2xl"} fontWeight={"bold"}>
                      Now Playing
                    </Text>
                    {queue.now_playing ? (
                      <NowPlayingCard
                        request={queue.now_playing}
                        video={queue.now_playing.Video}
                        pgStatus={queue.now_playing.Video.PG_Status}
                        publicView={true}
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
                  <Text mr={4} as={"u"} fontSize={"2xl"} fontWeight={"bold"}>
                    Suggestion List
                  </Text>
                  {!user ? (
                    <Link passHref={true} href={"/api/auth/login"}>
                      <Button
                        className="request-button"
                        my={2}
                        isLoading={isLoading}
                        leftIcon={<IoLogoTwitch />}
                      >
                        Sign In to Suggest
                      </Button>
                    </Link>
                  ) : 
                    !queue.is_paused ?
                    <Button
                      className="request-button"
                      my={2}
                      onClick={handleAddModalOpen}
                    >
                      Add Suggestion
                    </Button>
                    : <p>Suggestion List is paused ⏸️</p>
                  }
                  <Box
                    className="request-queue-list"
                    maxH={[500, 1000]}
                    overflowY={"auto"}
                  >
                    {!queueError &&
                      queue &&
                      queue?.order.map((request) => {
                        return (
                          <RequestCard
                            key={`key${request.id}`}
                            id={request.id}
                            request={request}
                            video={request.Video}
                            publicView={true}
                            user={user}
                          />
                        );
                      })}
                  </Box>
                </Box>
              ) : (
                <Box px={[4, 5]} w={["100%", "49%"]}>
                  <Box
                    rounded="lg"
                    bgColor={"red.700"}
                    textAlign="center"
                    p={2}
                  >
                    <Text fontWeight="bold">Suggestion List is Closed</Text>
                  </Box>
                </Box>
              )}
              <Box px={[4, 5]} w={["100%", "50%"]}>
                {/* Potential spot for Socials and twitch embed */}
                <Box width={"100%"}>
                  <Text as={"u"} fontSize={"2xl"} fontWeight={"bold"}>
                    Recently Played
                  </Text>
                  <Link href="/previously-played" passHref>
                    <ChakraLink fontWeight={"medium"} ml={2}>
                      View Previously Played
                    </ChakraLink>
                  </Link>
                  {queue?.recentlyPlayed.map((request) => {
                    return (
                      <RequestCard
                        key={`key${request.id}`}
                        id={request.id}
                        request={request}
                        video={request.Video}
                        publicView={true}
                        user={user}
                      />
                    );
                  })}
                </Box>
              </Box>
            </Stack>
          ) : (
            <Box w={"100%"} alignContent="center">
              <Text>Loading...</Text>
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

export default Home;
