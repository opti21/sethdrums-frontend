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
} from "@chakra-ui/react";
import Link from "next/link";
import { FC } from "react";
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
  // console.log(user);
  // Until Auth0 fixes their twitch integration or rules
  // @ts-ignore
  const username: string = user?.preferred_username;

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
              <VisuallyHidden>Pepega Panel</VisuallyHidden>
            </chakra.a>
            <chakra.h1 fontSize="xl" fontWeight="medium" ml="2">
              Pepega Panel
            </chakra.h1>
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
              >
                {colorMode === "light" ? <IoMdMoon /> : <IoMdSunny />}
              </IconButton>
              {user ? (
                <>
                  <chakra.h1 fontSize="xl" fontWeight="medium" ml="2">
                    {username}
                  </chakra.h1>
                  <Avatar size="md" src={user?.picture ? user.picture : ""} />
                  <Link passHref={true} href={"/api/auth/logout"}>
                    <Button isLoading={isLoading} variant="ghost">
                      Sign out
                    </Button>
                  </Link>
                </>
              ) : (
                <Link
                  passHref={true}
                  href={`/api/auth/login?returnTo=${returnTo}`}
                >
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
                {user ? (
                  <>
                    <Link passHref={true} href={"/api/auth/logout"}>
                      <Button isLoading={isLoading} variant="ghost">
                        Sign out
                      </Button>
                    </Link>
                    <Avatar size="sm" src={user?.picture ? user.picture : ""} />
                  </>
                ) : (
                  <Link passHref={true} href={"/api/auth/login"}>
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
