import {
  Container,
  Box,
  Alert,
  Text,
  AlertIcon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";
import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import "js-video-url-parser/lib/provider/youtube";
import Image from "next/image";
import useSWR from "swr";
import Link from "next/link";
import { useFeature } from "@growthbook/growthbook-react";
import HistoryTable from "../components/HistoryTable";
import { ChevronRightIcon } from "@chakra-ui/icons";

const PreviouslyPlayed: NextPage = () => {
  const [startDate, setStartDate] = useState(new Date());

  const { data: historyData, error: historyError } = useSWR(
    "/api/public/previously-played"
  );
  const comingSoon = useFeature("coming-soon").on;

  if (comingSoon) {
    return (
      <>
        <Head>
          <title>SethDrums Previously Played</title>
          <meta name="description" content="SethDrums Previously Played" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Container maxW={"container.xl"} p={0}>
          <Box w={"100%"} textAlign="center">
            <Image src="/SD_Logo_Neon.png" width={391} height={200} />
            <Text>Coming Soon...</Text>
          </Box>
        </Container>
      </>
    );
  }
  console.log(historyData);

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
            <Link href="/history" passHref>
              <BreadcrumbLink>Previously Played</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
        </Breadcrumb>
        {historyError && (
          <Alert mt={2} status="error">
            Error fetching queue
          </Alert>
        )}
        {!historyError && historyData ? (
          <Box py={2}>
            <Alert status="info">
              <AlertIcon />
              <Text>Date picker coming soon</Text>
            </Alert>
            <HistoryTable data={historyData} />
            {/* <DatePicker
              selected={startDate}
              customInput={<Input w={200} />}
              highlightDates={[new Date("04-23-2022"), new Date("04-19-2022")]}
              onChange={(date: Date) => setStartDate(date)}
            /> */}
          </Box>
        ) : (
          <Box w={"100%"} alignContent="center">
            <Text>Loading Pervious Played...</Text>
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

export default PreviouslyPlayed;
