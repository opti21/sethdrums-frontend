import {
  Container,
  Box,
  Alert,
  Text,
  Link as ChakraLink,
  Button,
  Input,
  FormLabel,
  Stack,
} from "@chakra-ui/react";
import axios from "axios";
import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { useUser } from "@auth0/nextjs-auth0";
import Image from "next/image";
import BanTable from "../../components/BanTable";
import Link from "next/link";
import { AiOutlineLeft } from "react-icons/ai";
import useSWR from "swr";
import { Video } from "@prisma/client";

const Mod: NextPage = () => {
  const { user, error: userError, isLoading } = useUser();
  const {
    data: bannedVideos,
    error: bannedError,
    mutate,
  } = useSWR("/api/mod/videos/banned", {
    refreshInterval: 0,
  });
  const [titleSearch, setTitleSearch] = useState("");
  const [idSearch, setIDSearch] = useState("");

  const handleTitleSearch = (event) => {
    setTitleSearch(event.target.value);
  };

  const handleIDSearch = (event) => {
    setIDSearch(event.target.value);
  };

  const bannedData = () => {
    const titleFilter = bannedVideos.filter((video: Video) => {
      return video.title.toLowerCase().includes(titleSearch.toLowerCase());
    });

    const idFilter = titleFilter.filter((video: Video) => {
      return video.youtube_id.includes(idSearch);
    });

    return idFilter;
  };

  return (
    <>
      <Head>
        <title>Banned Videos</title>
        <meta name="description" content="Banned Videos" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/mod/banned-videos" />

        {isLoading && !bannedError && (
          <Box w={"100%"} alignContent="center">
            <Text>Loading Banned Videos...</Text>
            <Image
              src="/loading.gif"
              alt="loading seth's huge forehead"
              width={384}
              height={96}
            />
          </Box>
        )}
        {!user && !isLoading && (
          <Alert mt={2} status="error">
            You must be signed in and a mod to access this page
          </Alert>
        )}
        {bannedError && (
          <Alert mt={2} status="error">
            {bannedError.status === 403
              ? "You must be a mod to see this page"
              : "Api Error"}
          </Alert>
        )}
        {bannedVideos && (
          <>
            <Box mb={20}>
              <Link href="/mod" passHref>
                <Button m={2} leftIcon={<AiOutlineLeft />}>
                  Back to Mod View
                </Button>
              </Link>
              <Stack direction={["column", "row"]}>
                <Box m={2}>
                  <FormLabel htmlFor="titleSearch">Search By Title</FormLabel>
                  <Input id="titleSearch" onChange={handleTitleSearch} />
                </Box>
                <Box m={2} p={2}>
                  <FormLabel htmlFor="idSearch">Search By ID</FormLabel>
                  <Input id="idSearch" onChange={handleIDSearch} />
                </Box>
              </Stack>
              <BanTable data={bannedData()} />
            </Box>
          </>
        )}
      </Container>
    </>
  );
};

export default Mod;
