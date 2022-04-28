import {
  Stack,
  VStack,
  Link as ChakraLink,
  HStack,
  Text,
  AspectRatio,
} from "@chakra-ui/react";
import Link from "next/link";
import { forwardRef } from "react";
import { IoLogoTwitch, IoLogoTwitter, IoLogoYoutube } from "react-icons/io";
import ReactPlayer from "react-player";

const Socials = () => {
  return (
    <Stack direction={"row"}>
      <VStack w="100%" align="left">
        <Text fontWeight="bold" as="u">
          Socials:
        </Text>
        <Link href="https://twitch.tv/sethdrums" passHref>
          <ChakraLink isExternal>
            <HStack>
              <IoLogoTwitch />
              <Text>Twitch</Text>
            </HStack>
          </ChakraLink>
        </Link>
        <Link href="https://www.youtube.com/sethdrums" passHref>
          <ChakraLink isExternal>
            <HStack>
              <IoLogoYoutube />
              <Text>Youtube</Text>
            </HStack>
          </ChakraLink>
        </Link>
        <Link href="https://twitter.com/imSethDrums" passHref>
          <ChakraLink isExternal>
            <HStack>
              <IoLogoTwitter />
              <Text>Twitter</Text>
            </HStack>
          </ChakraLink>
        </Link>
      </VStack>
      <AspectRatio maxW="75%" minW="75%" ratio={16 / 9}>
        <ReactPlayer
          url={"https://twitch.tv/sethdrums"}
          height={"100%"}
          width={"100%"}
          controls={true}
        />
      </AspectRatio>
    </Stack>
  );
};

export default Socials;
