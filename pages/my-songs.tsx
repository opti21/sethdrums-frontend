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
  HStack,
  Grid,
  GridItem,
  AspectRatio,
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
import ReactPlayer from 'react-player/youtube'


const MySongs: NextPage = () => {
  const { data: savedSongsData, error: savedSongsError } = useSWR(
    "/api/public/saved-songs", null, {
      refreshInterval: 0,
      refreshWhenHidden: false
    }
  );

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
            <Grid py={2} templateColumns='repeat(5, 1fr)' width={"100%"}>
              <GridItem colSpan={3} width={"100%"}>
                <AspectRatio ratio={ 16/9} >
                <ReactPlayer width={"100%"} height={"100%"} url={savedSongsData.map((video) => `https://www.youtube.com/watch?v=${video.youtube_id}`)} />
                </AspectRatio>
              </GridItem>
              <GridItem colSpan={2} width={"100%"}>
                <SavedSongsTable data={savedSongsData} />
              </GridItem>
            </Grid>
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
