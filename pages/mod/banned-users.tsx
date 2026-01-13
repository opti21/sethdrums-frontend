import {
  Container,
  Box,
  Alert,
  Text,
  Button,
  Input,
  FormLabel,
  Stack,
  Divider,
  Textarea,
  HStack,
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
import axios from "axios";
import { toast } from "react-toastify";

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

  // Manual ban form state
  const [banUsername, setBanUsername] = useState("");
  const [banTwitchId, setBanTwitchId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [useIdMode, setUseIdMode] = useState(false);

  const handleUsernameSearch = (event) => {
    setUsernameSearch(event.target.value);
  };

  const filteredData = () => {
    if (!bannedUsers) return [];
    return bannedUsers.filter((user: BannedUser) =>
      user.twitch_username.toLowerCase().includes(usernameSearch.toLowerCase())
    );
  };

  const handleManualBan = async () => {
    if (useIdMode) {
      // Direct ID mode
      if (!banTwitchId.trim() || !banUsername.trim()) {
        toast.error("Please enter both Twitch ID and username");
        return;
      }

      setIsBanning(true);

      try {
        const banRes = await axios.post("/api/mod/users/banned", {
          twitch_id: banTwitchId.trim(),
          twitch_username: banUsername.trim(),
          reason: banReason || null,
        });

        if (banRes.data.success) {
          toast.success(`Banned ${banUsername}. ${banRes.data.removedRequests} request(s) removed.`);
          setBanUsername("");
          setBanTwitchId("");
          setBanReason("");
          mutate();
        }
      } catch (err: any) {
        if (err.response?.status === 409) {
          toast.error("User is already banned");
        } else if (err.response?.status === 403) {
          toast.error("Cannot ban a moderator");
        } else {
          toast.error("Error banning user");
          console.error(err);
        }
      }

      setIsBanning(false);
    } else {
      // Username lookup mode
      if (!banUsername.trim()) {
        toast.error("Please enter a username");
        return;
      }

      setIsLookingUp(true);

      try {
        // Look up the Twitch user ID
        const lookupRes = await axios.get(
          `/api/mod/users/lookup?username=${encodeURIComponent(banUsername.trim())}`
        );

        if (!lookupRes.data.success) {
          toast.error("User not found on Twitch");
          setIsLookingUp(false);
          return;
        }

        const { id: twitch_id, display_name } = lookupRes.data.user;
        setIsLookingUp(false);
        setIsBanning(true);

        // Ban the user
        const banRes = await axios.post("/api/mod/users/banned", {
          twitch_id,
          twitch_username: display_name,
          reason: banReason || null,
        });

        if (banRes.data.success) {
          toast.success(`Banned ${display_name}. ${banRes.data.removedRequests} request(s) removed.`);
          setBanUsername("");
          setBanReason("");
          mutate();
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error("User not found on Twitch");
        } else if (err.response?.status === 409) {
          toast.error("User is already banned");
        } else if (err.response?.status === 403) {
          toast.error("Cannot ban a moderator");
        } else {
          toast.error("Error banning user");
          console.error(err);
        }
      }

      setIsLookingUp(false);
      setIsBanning(false);
    }
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
              {/* Manual Ban Form */}
              <Box m={2} p={4} borderWidth="1px" borderRadius="lg">
                <HStack mb={3} justify="space-between">
                  <Text fontWeight="bold">Ban User Manually</Text>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUseIdMode(!useIdMode);
                      setBanUsername("");
                      setBanTwitchId("");
                    }}
                  >
                    {useIdMode ? "Use Username" : "Use ID"}
                  </Button>
                </HStack>
                <Stack direction={["column", "row"]} spacing={4}>
                  {useIdMode ? (
                    <>
                      <Box flex={1}>
                        <FormLabel htmlFor="banTwitchId">Twitch ID</FormLabel>
                        <Input
                          id="banTwitchId"
                          value={banTwitchId}
                          onChange={(e) => setBanTwitchId(e.target.value)}
                          placeholder="Enter Twitch ID"
                        />
                      </Box>
                      <Box flex={1}>
                        <FormLabel htmlFor="banUsername">Display Name</FormLabel>
                        <Input
                          id="banUsername"
                          value={banUsername}
                          onChange={(e) => setBanUsername(e.target.value)}
                          placeholder="Enter display name"
                        />
                      </Box>
                    </>
                  ) : (
                    <Box flex={1}>
                      <FormLabel htmlFor="banUsername">Twitch Username</FormLabel>
                      <Input
                        id="banUsername"
                        value={banUsername}
                        onChange={(e) => setBanUsername(e.target.value)}
                        placeholder="Enter Twitch username"
                      />
                    </Box>
                  )}
                  <Box flex={1}>
                    <FormLabel htmlFor="banReason">Reason (optional)</FormLabel>
                    <Input
                      id="banReason"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Enter ban reason"
                    />
                  </Box>
                  <Box alignSelf="flex-end">
                    <Button
                      colorScheme="red"
                      onClick={handleManualBan}
                      isLoading={isLookingUp || isBanning}
                      loadingText={isLookingUp ? "Looking up..." : "Banning..."}
                    >
                      Ban User
                    </Button>
                  </Box>
                </Stack>
              </Box>

              <Divider my={4} />

              {/* Search */}
              <Stack direction={["column", "row"]}>
                <Box m={2}>
                  <FormLabel htmlFor="usernameSearch">
                    Search Banned Users
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
