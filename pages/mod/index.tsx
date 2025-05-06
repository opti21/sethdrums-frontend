import {
  Container,
  Box,
  Alert,
  HStack,
  Text,
  Stack,
  Avatar,
} from "@chakra-ui/react";
import axios from "axios";
import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { useUser } from "@auth0/nextjs-auth0";
import { toast } from "react-toastify";
import Pusher from "pusher-js";
import Image from "next/image";
import PGConfirmModal from "../../components/modals/PGConfirmModal";
import PGCheckerModal from "../../components/modals/PGCheckerModal";
import { useModQueueStore } from "../../stateStore/queueState";
import ModQueue from "../../components/ModQueue";
import ScrollToTop from "react-scroll-to-top";
import { ArrowUpIcon } from "@chakra-ui/icons";

const Mod: NextPage = () => {
  const { user, error: userError, isLoading } = useUser();
  const [pusherConnected, setPusherConnected] = useState<boolean>(false);
  const [modsOnline, setModsOnline] = useState<any[]>([]);

  const queue = useModQueueStore((state) => state.queue);
  const setQueue = useModQueueStore((state) => state.setQueue);

  const queueError = useModQueueStore((state) => state.queueError);
  const setQueueError = useModQueueStore((state) => state.setQueueError);

  const setQueueStatus = useModQueueStore((state) => state.setQueueStatus);

  const beingUpdatedBy = useModQueueStore((state) => state.beingUpdatedBy);
  const setBeingUpdatedBy = useModQueueStore(
    (state) => state.setBeingUpdatedBy
  );

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

    const fetchQueue = () => {
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
    };

    if (!pusherConnected) {
      channel.bind("pusher:subscription_error", (error) => {
        console.error(error);
        if (error.status === 403) {
          setQueueError("Only mods and seth can access this page");
          return;
        }
      });

      channel.bind("pusher:subscription_succeeded", (members) => {
        console.log("pusher connected");

        members.each((member) => {
          setModsOnline((currModsOnline) => [...currModsOnline, member]);
        });

        fetchQueue();
      });

      channel.bind("pusher:member_added", (member) => {
        setModsOnline((currOnlineMods) => [...currOnlineMods, member]);
      });

      channel.bind("pusher:member_removed", (member) => {
        setModsOnline((currOnlineMods) => {
          const updatedMods = currOnlineMods.filter((mod) => {
            return member.id != mod.id;
          });

          return [...updatedMods];
        });
      });

      channel.bind("lock-queue", (data: any) => {
        setQueueStatus("updating");
        setBeingUpdatedBy(data.beingUpdatedBy);
      });

      channel.bind("unlock-queue", (data: any) => {
        if (beingUpdatedBy === user?.preferred_username) {
          setQueueStatus("ready");
          setBeingUpdatedBy("");
          return;
        }

        fetchQueue();
      });

      channel.bind("queue-add", (data: any) => {
        toast.info("New Request Added", {
          onClick: () =>
            window.scroll({
              top: document.body.offsetHeight,
              left: 0,
              behavior: "smooth",
            }),
          toastId: "new-song",
          position: "bottom-left",
          pauseOnFocusLoss: false,
        });

        fetchQueue();
      });

      channel.bind("update-queue", (data: any) => {
        fetchQueue();
      });

      channel.bind("request-updated", (data: any) => {
        toast.info("User updated request", {
          onClick: () =>
            window.scroll({
              top: document.body.offsetHeight,
              left: 0,
              behavior: "smooth",
            }),
          toastId: "updated-request",
          position: "bottom-left",
          pauseOnFocusLoss: false,
        });

        fetchQueue();
      });
      setPusherConnected(true);
    }

    return () => {
      pusher.disconnect();
    };
  }, [user]);

  return (
    <>
      <Head>
        <title>Mod Panel</title>
        <meta name="description" content="Mod Panel" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/mod" />

        <PGCheckerModal />
        <PGConfirmModal />

        <ScrollToTop
          smooth
          style={{ backgroundColor: "Background" }}
          component={<ArrowUpIcon color="white" />}
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
              <Stack direction={"row"} pt={5}>
                <Box px={[4, 5]} w={["100%", "80%"]}>
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
                    mb={2}
                  >
                    <Text fontWeight="bold">
                      Suggestion List is{" "}
                      {queue?.is_paused
                        ? "Paused"
                        : queue?.is_open
                          ? queue?.is_subOnly
                            ? "Open To Subs Only"
                            : "Open To Everyone"
                          : "Closed"}
                    </Text>
                  </Box>
                  <ModQueue />
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
            </>
          ) : (
            <Box w={"100%"} alignContent="center">
              <Text>Loading Suggestion List...</Text>
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
