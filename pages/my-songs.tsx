import {
  Container,
  Box,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  HStack,
  AspectRatio,
  VStack,
  Button,
  List,
  ListItem,
  IconButton,
  Switch,
  Input,
} from "@chakra-ui/react";
import { NextPage } from "next";
import Head from "next/head";
import Nav from "../components/Nav";
import useSWR from "swr";
import Link from "next/link";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { auth0 } from "../lib/auth0";
import ReactPlayer from "react-player/youtube";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

type SavedSong = {
  id: number;
  title: string;
  youtube_id: string;
};

type PlaylistSong = {
  id: number;
  title: string;
  url: string;
};

const UNAVAILABLE_YOUTUBE_TITLES = new Set([
  "Private video",
  "Deleted video",
  "Video unavailable",
]);

const MySongs: NextPage = () => {
  const { data: savedSongsData, error: savedSongsError, mutate } = useSWR(
    "/api/public/saved-songs",
    null,
    {
      refreshInterval: 0,
      refreshWhenHidden: false,
    }
  );

  const [currentSongId, setCurrentSongId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByRecent, setSortByRecent] = useState(true);
  const [sortReady, setSortReady] = useState(false);

  const playerRef = useRef(null);
  const currentItemRef = useRef<HTMLLIElement | null>(null);
  const skipInProgressRef = useRef(false);
  const unavailableSkipCountRef = useRef(0);
  const unavailableCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSongIdRef = useRef<number | null>(null);
  const currentSongRef = useRef<PlaylistSong | null>(null);
  const sortedPlaylistRef = useRef<PlaylistSong[]>([]);

  const playlist = useMemo<PlaylistSong[]>(() => {
    return savedSongsData
      ? savedSongsData.map((video: SavedSong) => ({
          id: video.id,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
        }))
      : [];
  }, [savedSongsData]);

  const sortedPlaylist = useMemo(() => {
    return sortByRecent ? playlist.slice().reverse() : playlist.slice();
  }, [playlist, sortByRecent]);

  const visiblePlaylist = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedPlaylist;
    }

    return sortedPlaylist.filter((video) =>
      video.title.toLowerCase().includes(query)
    );
  }, [sortedPlaylist, searchQuery]);

  const currentSong = useMemo(() => {
    if (currentSongId == null) {
      return null;
    }

    return playlist.find((video) => video.id === currentSongId) ?? null;
  }, [playlist, currentSongId]);

  currentSongIdRef.current = currentSongId;
  currentSongRef.current = currentSong;
  sortedPlaylistRef.current = sortedPlaylist;

  useEffect(() => {
    const storedSortPreference = localStorage.getItem("sortByRecent");
    if (storedSortPreference !== null) {
      setSortByRecent(JSON.parse(storedSortPreference));
    }
    setSortReady(true);
  }, []);

  useEffect(() => {
    if (!sortReady) {
      return;
    }

    if (playlist.length === 0) {
      setCurrentSongId(null);
      setIsPlaying(false);
      return;
    }

    if (currentSongId != null && playlist.some((video) => video.id === currentSongId)) {
      return;
    }

    setCurrentSongId(sortedPlaylist[0]?.id ?? null);
  }, [sortReady, playlist, sortedPlaylist, currentSongId]);

  useEffect(() => {
    skipInProgressRef.current = false;
  }, [currentSongId]);

  useEffect(() => {
    return () => {
      if (unavailableCheckTimeoutRef.current) {
        clearTimeout(unavailableCheckTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentSongId, sortByRecent, searchQuery]);

  const toggleSort = () => {
    setSortByRecent((prev) => {
      const nextSortByRecent = !prev;
      localStorage.setItem("sortByRecent", JSON.stringify(nextSortByRecent));
      return nextSortByRecent;
    });
  };

  const showCurrentSong = () => {
    if (searchQuery) {
      setSearchQuery("");
      return;
    }

    currentItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentSongId((prevId) => {
      const queue = sortedPlaylistRef.current;
      if (queue.length === 0) {
        return prevId;
      }

      const currentIndex = queue.findIndex((video) => video.id === prevId);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % queue.length;
      return queue[nextIndex].id;
    });
  };

  const handlePrevious = () => {
    setCurrentSongId((prevId) => {
      const queue = sortedPlaylistRef.current;
      if (queue.length === 0) {
        return prevId;
      }

      const currentIndex = queue.findIndex((video) => video.id === prevId);
      const previousIndex =
        currentIndex === -1
          ? queue.length - 1
          : (currentIndex - 1 + queue.length) % queue.length;
      return queue[previousIndex].id;
    });
  };

  const skipUnavailableVideo = () => {
    const video = currentSongRef.current;
    const queue = sortedPlaylistRef.current;
    if (!video || queue.length === 0 || skipInProgressRef.current) {
      return;
    }

    skipInProgressRef.current = true;
    unavailableSkipCountRef.current += 1;
    toast.warn(`${video.title} is unavailable and was skipped`);

    if (unavailableSkipCountRef.current >= queue.length) {
      setIsPlaying(false);
      unavailableSkipCountRef.current = 0;
      skipInProgressRef.current = false;
      return;
    }

    handleNext();
  };

  const handlePlayerReady = () => {
    const songIdWhenReady = currentSongIdRef.current;

    const checkIfUnavailable = () => {
      if (currentSongIdRef.current !== songIdWhenReady) {
        return;
      }

      const internalPlayer = (playerRef.current as any)?.getInternalPlayer?.();
      const youtubeTitle = internalPlayer?.getVideoData?.()?.title;

      if (UNAVAILABLE_YOUTUBE_TITLES.has(youtubeTitle)) {
        skipUnavailableVideo();
      }
    };

    checkIfUnavailable();

    if (unavailableCheckTimeoutRef.current) {
      clearTimeout(unavailableCheckTimeoutRef.current);
    }
    unavailableCheckTimeoutRef.current = setTimeout(checkIfUnavailable, 400);
  };

  const handlePlayerStart = () => {
    unavailableSkipCountRef.current = 0;
  };

  const handleVideoSelect = (id: number) => {
    setCurrentSongId(id);
    setIsPlaying(true);
  };

  const handleVideoEnded = () => {
    if (autoplay) {
      handleNext();
    } else {
      setIsPlaying(false);
    }
  };

  const toggleAutoplay = () => {
    setAutoplay(!autoplay);
  };

  const handleRemoveSavedSong = async (id: number) => {
    if (!Number.isInteger(id) || id <= 0) {
      toast.error("Error removing video");
      return;
    }

    await axios
      .delete("/api/public/saved-songs", {
        data: {
          video_id: id,
        },
      })
      .then((res) => {
        if (res.status === 200) {
          if (id === currentSongId) {
            const currentIndex = sortedPlaylist.findIndex((video) => video.id === id);
            const nextSong =
              sortedPlaylist[currentIndex + 1] ?? sortedPlaylist[currentIndex - 1];
            setCurrentSongId(nextSong && nextSong.id !== id ? nextSong.id : null);
          }
          toast.success("Video Removed from Saved Songs");
          mutate();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error removing video");
      });
  };

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
            <BreadcrumbLink as={Link} href="/">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/my-songs">
              My Songs
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <Box w="100%" mb={4}>
          <HStack
            spacing={4}
            align="stretch"
            flexDirection={{ base: "column", md: "row" }}
            flexWrap="nowrap"
          >
            <Box flex={["1", "1", "3"]}>
              {currentSong ? (
                <AspectRatio ratio={16 / 9}>
                  <ReactPlayer
                    key={currentSong.id}
                    ref={playerRef}
                    url={currentSong.url}
                    playing={isPlaying}
                    controls={true}
                    width="100%"
                    height="100%"
                    onEnded={handleVideoEnded}
                    onError={skipUnavailableVideo}
                    onReady={handlePlayerReady}
                    onStart={handlePlayerStart}
                  />
                </AspectRatio>
              ) : (
                <Box
                  height="0"
                  paddingBottom="56.25%"
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text>No videos in playlist</Text>
                </Box>
              )}
              <HStack justifyContent="center" mt={2}>
                <HStack>
                  <Button onClick={handlePrevious} isDisabled={sortedPlaylist.length === 0}>
                    <SkipBack />
                  </Button>
                  <Button onClick={handlePlayPause} isDisabled={sortedPlaylist.length === 0}>
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                  <Button onClick={handleNext} isDisabled={sortedPlaylist.length === 0}>
                    <SkipForward />
                  </Button>
                </HStack>
              </HStack>
              <HStack justifyContent="center" mt={2}>
                <Text>Autoplay</Text>
                <Switch isChecked={autoplay} onChange={toggleAutoplay} />
              </HStack>
            </Box>
            <VStack flex={["1", "1", "2"]} spacing={4} align="stretch">
              <Input
                placeholder="Search videos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                mb={4}
              />

              <HStack spacing={2} width={"100%"}>
                <Button width={"100%"} onClick={showCurrentSong} isDisabled={!currentSong}>
                  Show Current Song
                </Button>
                <Button width={"100%"} onClick={toggleSort}>
                  Sort by {sortByRecent ? "Oldest" : "Most Recent"}
                </Button>
              </HStack>

              {currentSong && (
                <Text fontSize="sm" noOfLines={1}>
                  Playing: {currentSong.title}
                </Text>
              )}

              {visiblePlaylist.length > 0 ? (
                <List spacing={2} overflowY="auto" maxH={["280px", "320px", "520px"]}>
                  {visiblePlaylist.map((video) => {
                    const isSelected = video.id === currentSong?.id;

                    return (
                      <ListItem
                        key={video.id}
                        ref={(el) => {
                          if (isSelected) {
                            currentItemRef.current = el;
                          }
                        }}
                        onClick={() => {
                          handleVideoSelect(video.id);
                        }}
                        bg={isSelected ? "gray.700" : "gray.500"}
                        color={isSelected ? "white" : "black"}
                        p={3}
                        borderRadius="md"
                        boxShadow="sm"
                        cursor="pointer"
                        scrollMargin="8px"
                        _hover={{ bg: "gray.600" }}
                        transition="all 0.2s"
                      >
                        <HStack justifyContent="space-between">
                          <Text fontWeight={isSelected ? "bold" : "normal"}>{video.title}</Text>
                          <IconButton
                            icon={<Trash2 size={18} />}
                            aria-label="Remove video"
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSavedSong(video.id);
                            }}
                          />
                        </HStack>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Text>No videos found</Text>
              )}
            </VStack>
          </HStack>
        </Box>
      </Container>
    </>
  );
};

export default MySongs;

export const getServerSideProps = auth0.withPageAuthRequired();
