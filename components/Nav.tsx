import { useUser } from "@auth0/nextjs-auth0";
import {
  Avatar,
  Box,
  Button,
  chakra,
  CloseButton,
  Flex,
  HStack,
  IconButton,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VisuallyHidden,
  VStack,
  Link as ChakraLink,
  Text,
  Image,
} from "@chakra-ui/react";
import Link from "next/link";
import axios from "axios";
import { FC, useEffect, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { IoMdMoon, IoMdSunny } from "react-icons/io";

type NavProps = {
  returnTo: string;
};

const Nav: FC<NavProps> = ({ returnTo }) => {
  const { user, error, isLoading } = useUser();
  const bg = useColorModeValue("pink", "pink.400");
  const mobileNav = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  // Until Auth0 fixes their twitch integration or rules
  const username = user?.preferred_username as string;
  const [isMod, setIsMod] = useState(false);
  const [isSeth, setIsSeth] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      axios.get("/api/mod/isMod").then((res) => {
        if (res.status === 200) {
          setIsMod(true);
        }
        if (res.status === 201) {
          setIsSeth(true);
        }
      });
    }
  }, [user, isLoading]);

  return (
    <>
      <chakra.header
        bg={bg}
        w="full"
        px={{ base: 2, sm: 4 }}
        py={4}
        shadow="md"
      >
        <Flex alignItems="center" justifyContent="space-between" mx="auto">
          <Flex>
            <chakra.a
              href="/"
              title="Pepega Panel Home Page"
              display="flex"
              alignItems="center"
            >
              <VisuallyHidden>SethDrums Song Panel</VisuallyHidden>
            </chakra.a>
            <Link href="/" passHref>
              <ChakraLink style={{ textDecoration: "none" }}>
                <Text p={1} fontWeight="bold">
                  SethDrums Song Panel
                </Text>
              </ChakraLink>
            </Link>
          </Flex>
          <HStack display="flex" alignItems="center" spacing={1}>
            <HStack
              spacing={1}
              mr={1}
              color="brand.600"
              display={{ base: "none", md: "inline-flex" }}
            >
              <IconButton
                aria-label="Toggle Light Mode"
                onClick={toggleColorMode}
                size="sm"
              >
                {colorMode === "light" ? <IoMdMoon /> : <IoMdSunny />}
              </IconButton>
              {user ? (
                <>
                  {isMod && (
                    <Link href="/mod" passHref>
                      <ChakraLink
                        fontWeight={"medium"}
                        mx={2}
                        size="sm"
                        p={2}
                        variant="ghost"
                      >
                        Mod View
                      </ChakraLink>
                    </Link>
                  )}
                  {isSeth && (
                    <Link href="/seth" passHref>
                      <ChakraLink
                        fontWeight={"medium"}
                        mx={2}
                        size="sm"
                        p={2}
                        variant="ghost"
                      >
                        Seth View
                      </ChakraLink>
                    </Link>
                  )}
                  <Avatar size="sm" src={user?.picture ? user.picture : ""} />
                  <chakra.h1 fontSize="md" fontWeight="medium" px={1}>
                    {username}
                  </chakra.h1>
                  <Link href={"/api/auth/logout"} passHref>
                    <Button size={"sm"} isLoading={isLoading} variant="ghost">
                      Sign out
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href={`/api/auth/login?returnTo=${returnTo}`} passHref>
                  <Button isLoading={isLoading} variant="ghost">
                    Sign in
                  </Button>
                </Link>
              )}
            </HStack>
            <Box display={{ base: "inline-flex", md: "none" }}>
              <IconButton
                display={{ base: "flex", md: "none" }}
                aria-label="Open menu"
                fontSize="20px"
                color={useColorModeValue("gray.800", "inherit")}
                variant="ghost"
                icon={<AiOutlineMenu />}
                onClick={mobileNav.onOpen}
              />

              <VStack
                pos="absolute"
                top={0}
                left={0}
                right={0}
                display={mobileNav.isOpen ? "flex" : "none"}
                zIndex={1}
                flexDirection="column"
                p={2}
                pb={4}
                m={2}
                bg={bg}
                spacing={3}
                rounded="sm"
                shadow="sm"
              >
                <CloseButton
                  aria-label="Close menu"
                  onClick={mobileNav.onClose}
                />
                {isMod && (
                  <Link href="/mod" passHref>
                    <ChakraLink
                      fontWeight={"medium"}
                      mx={2}
                      size="sm"
                      p={2}
                      variant="ghost"
                    >
                      Mod View
                    </ChakraLink>
                  </Link>
                )}
                {isSeth && (
                  <Link href="/seth" passHref>
                    <ChakraLink
                      fontWeight={"medium"}
                      mx={2}
                      size="sm"
                      p={2}
                      variant="ghost"
                    >
                      Seth View
                    </ChakraLink>
                  </Link>
                )}
                {user ? (
                  <>
                    <Link href={"/api/auth/logout"} passHref>
                      <Button isLoading={isLoading} variant="ghost">
                        Sign out
                      </Button>
                    </Link>
                    <Avatar size="sm" src={user?.picture ? user.picture : ""} />
                  </>
                ) : (
                  <Link href={"/api/auth/login"} passHref>
                    <Button isLoading={isLoading} variant="ghost">
                      Sign in
                    </Button>
                  </Link>
                )}
              </VStack>
            </Box>
          </HStack>
        </Flex>
      </chakra.header>
    </>
  );
};

export default Nav;
