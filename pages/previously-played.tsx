import {
  Container,
  Box,
  Alert,
  Text,
  AlertIcon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Input,
} from "@chakra-ui/react";
import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import "js-video-url-parser/lib/provider/youtube";
import Image from "next/image";
import useSWR from "swr";
import Link from "next/link";
import HistoryTable from "../components/HistoryTable";
import DatePicker from "react-datepicker";
import { ChevronRightIcon } from "@chakra-ui/icons";

const PreviouslyPlayed: NextPage = () => {
  // Selected date for filtering; null shows all
  const [startDate, setStartDate] = useState<Date | null>(null);

  // Fetch available dates to highlight on calendar
  const { data: datesData, error: datesError } = useSWR(
    "/api/public/previously-played?datesOnly=true"
  );
  const highlightDates = datesData
    ? (datesData as string[]).map((d) => new Date(d))
    : [];

  // Always send date as UTC YYYY-MM-DD
  function formatDateUTC(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const dateQuery = startDate ? formatDateUTC(startDate) : null;
  const historyKey = dateQuery
    ? `/api/public/previously-played?date=${dateQuery}`
    : "/api/public/previously-played";
  const { data: historyData, error: historyError } = useSWR(historyKey);

  // if (comingSoon) {
  //   return (
  //     <>
  //       <Head>
  //         <title>SethDrums Previously Played</title>
  //         <meta name="description" content="SethDrums Previously Played" />
  //         <link rel="icon" href="/favicon.ico" />
  //       </Head>
  //       <Container maxW={"container.xl"} p={0}>
  //         <Box w={"100%"} textAlign="center">
  //           <Image src="/SD_Logo_Neon.png" width={391} height={200} />
  //           <Text>Coming Soon...</Text>
  //         </Box>
  //       </Container>
  //     </>
  //   );
  // }
  // console.log(historyData);

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
            <Link href="/previously-played" passHref>
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
            {/* Date picker to filter by day and highlight available dates */}
            <Box mb={4}>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                highlightDates={highlightDates}
                customInput={<Input w={200} />}
                placeholderText="Select a date"
                isClearable
              />
            </Box>
            <HistoryTable data={historyData} />
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
