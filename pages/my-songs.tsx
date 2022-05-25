import {
  Container,
  Box,
  Alert,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  AlertIcon,
  Code,
} from "@chakra-ui/react";
import { NextPage } from "next";
import Head from "next/head";
import Nav from "../components/Nav";
import "js-video-url-parser/lib/provider/youtube";
import Image from "next/image";
import useSWR from "swr";
import Link from "next/link";
import { ChevronRightIcon } from "@chakra-ui/icons";
import SavedSongsTable from "../components/SavedSongsTable";
import { withPageAuthRequired } from "@auth0/nextjs-auth0";

const MySongs: NextPage = () => {
  const { data: savedSongsData, error: savedSongsError } = useSWR(
    "/api/public/saved-songs"
  );
  console.log(savedSongsData);

  return (
    <>
      <Head>
        <title>Pepega Panel</title>
        <meta name="description" content="SethDrums - Previously Played" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/previously-played" />

        <Breadcrumb
          p={4}
          spacing="8px"
          separator={<ChevronRightIcon color="gray.500" />}
        >
          <BreadcrumbItem>
            <Link href="/" passHref>
              <BreadcrumbLink>Home</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link href="/my-songs" passHref>
              <BreadcrumbLink>My Songs</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
        </Breadcrumb>
        {savedSongsError && (
          <Alert mt={2} status="error">
            Error fetching saved songs
          </Alert>
        )}
        {!savedSongsError && savedSongsData ? (
          savedSongsData.length > 0 ? (
            <Box py={2}>
              <SavedSongsTable data={savedSongsData} />
            </Box>
          ) : (
            <Alert mt={2} status="info">
              <AlertIcon />
              No songs have been saved yet. To save a song type
              <Code mx={2}> !save </Code> in chat when a song is playing on
              stream.
            </Alert>
          )
        ) : (
          <Box w={"100%"} alignContent="center">
            <Text>Loading Saved Songs...</Text>
            <Image
              src="/loading.gif"
              alt="loading seth's huge forehead"
              width={384}
              height={96}
            />
          </Box>
        )}
      </Container>
    </>
  );
};

export default MySongs;

export const getServerSideProps = withPageAuthRequired();
