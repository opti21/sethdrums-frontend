import {
  Container,
  Box,
  Alert,
  Text,
  Link as ChakraLink,
  Button,
  Input,
  FormLabel,
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

const Mod: NextPage = () => {
  const { user, error: userError, isLoading } = useUser();
  const {
    data: bannedVideos,
    error: bannedError,
    mutate,
  } = useSWR("/api/mod/videos/banned", {
    refreshInterval: 0,
  });
  const [search, setSearch] = useState("");

  const handleSearch = (event) => {
    setSearch(event.target.value);
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
            <Box>
              <Link href="/mod" passHref>
                <Button m={2} leftIcon={<AiOutlineLeft />}>
                  Back to Mod View
                </Button>
              </Link>
              <Box p={4}>
                <FormLabel htmlFor="titleSearch">Search By Title</FormLabel>
                <Input w={"25%"} id="titleSearch" onChange={handleSearch} />
              </Box>
              <BanTable
                data={bannedVideos.filter((video) => {
                  return video.title
                    .toLowerCase()
                    .includes(search.toLowerCase());
                })}
              />
            </Box>
          </>
        )}
      </Container>
    </>
  );
};

export default Mod;
