import {
  Container,
  Box,
  Alert,
  Text,
  Button,
  Input,
  FormLabel,
  Stack,
} from "@chakra-ui/react";
import { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import Nav from "../../components/Nav";
import { useUser } from "@auth0/nextjs-auth0/client";
import Image from "next/image";
import BannedUsersTable from "../../components/BannedUsersTable";
import Link from "next/link";
import { AiOutlineLeft } from "react-icons/ai";
import useSWR from "swr";

interface BannedUser {
  id: number;
  twitch_id: string;
  twitch_username: string;
  reason: string | null;
  banned_by: string;
  banned_time: string;
}

const BannedUsers: NextPage = () => {
  const { user, error: userError, isLoading } = useUser();
  const {
    data: bannedUsers,
    error: bannedError,
    mutate,
  } = useSWR("/api/mod/users/banned", {
    refreshInterval: 0,
  });
  const [usernameSearch, setUsernameSearch] = useState("");

  const handleUsernameSearch = (event) => {
    setUsernameSearch(event.target.value);
  };

  const filteredData = () => {
    if (!bannedUsers) return [];
    return bannedUsers.filter((user: BannedUser) =>
      user.twitch_username.toLowerCase().includes(usernameSearch.toLowerCase())
    );
  };

  return (
    <>
      <Head>
        <title>Banned Users</title>
        <meta name="description" content="Banned Users" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxW={"container.xl"} p={0}>
        <Nav returnTo="/mod/banned-users" />

        {isLoading && !bannedError && (
          <Box w={"100%"} alignContent="center">
            <Text>Loading Banned Users...</Text>
            <Image
              src="/loading.gif"
              alt="loading"
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
        {bannedUsers && (
          <>
            <Box mb={20}>
              <Link href="/mod" passHref>
                <Button m={2} leftIcon={<AiOutlineLeft />}>
                  Back to Mod View
                </Button>
              </Link>
              <Stack direction={["column", "row"]}>
                <Box m={2}>
                  <FormLabel htmlFor="usernameSearch">
                    Search By Username
                  </FormLabel>
                  <Input id="usernameSearch" onChange={handleUsernameSearch} />
                </Box>
              </Stack>
              <BannedUsersTable data={filteredData()} />
            </Box>
          </>
        )}
      </Container>
    </>
  );
};

export default BannedUsers;
