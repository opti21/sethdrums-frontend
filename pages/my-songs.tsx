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
import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import ReactPlayer from 'react-player/youtube'
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const MySongs: NextPage = () => {
  const { data: savedSongsData, error: savedSongsError } = useSWR(
    "/api/public/saved-songs", null, {
    refreshInterval: 0,
    refreshWhenHidden: false
  }
  );

  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Number of items per page
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByRecent, setSortByRecent] = useState(true);

  const playerRef = useRef(null);

  useEffect(() => {
    const storedSortPreference = localStorage.getItem("sortByRecent");
    if (storedSortPreference !== null) {
      setSortByRecent(JSON.parse(storedSortPreference));
    }
  }, []);

  const toggleSort = () => {
    setSortByRecent((prev) => {
      const newSortByRecent = !prev;
      const sortedPlaylist = playlist.slice();
      if (newSortByRecent) {
        sortedPlaylist.reverse();
      }

      // Update the currentVideo index based on the new sorting order
      const currentSongUrl = playlist[currentVideo]?.url;
      const newIndex = sortedPlaylist.findIndex(video => video.url === currentSongUrl);

      if (newIndex !== -1) {
        setCurrentVideo(newIndex);
      }

      // Save the new sort preference in localStorage
      localStorage.setItem("sortByRecent", JSON.stringify(newSortByRecent));

      return newSortByRecent;
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const playlist = savedSongsData
    ? savedSongsData.map((video: { title: any; youtube_id: any; }) => {
      return {
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.youtube_id}`
      }
    })
    : [];

  // Filter and sort playlist
  const sortedAndFilteredPlaylist = useMemo(() => {
    const filtered = playlist.filter((video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return sortByRecent ? filtered.slice().reverse() : filtered.slice();
  }, [playlist, searchQuery, sortByRecent]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAndFilteredPlaylist.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(sortedAndFilteredPlaylist.length / itemsPerPage);

  const listItemRefs = useRef([]);

  // Function to scroll to the current song
  const scrollToCurrentSong = () => {
    // Clear the search query
    setSearchQuery("");

    // Calculate the page where the current video is located
    const currentSongPage = Math.ceil((currentVideo + 1) / itemsPerPage);

    // Set the current page to the page with the current video
    setCurrentPage(currentSongPage);

    // Scroll to the current video in the playlist
    setTimeout(() => {
      if (listItemRefs.current[currentVideo]) {
        listItemRefs.current[currentVideo].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 0);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentVideo((prev) => (prev + 1) % playlist.length);
  };

  const handlePrevious = () => {
    setCurrentVideo((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const handleVideoSelect = (index) => {
    // Calculate the global index of the selected video
    const globalIndex = index + (currentPage - 1) * itemsPerPage;

    // Find the actual index of this video in the original playlist
    const selectedVideoUrl = sortedAndFilteredPlaylist[globalIndex]?.url;
    const newIndex = playlist.findIndex(video => video.url === selectedVideoUrl);

    if (newIndex !== -1) {
      setCurrentVideo(newIndex);
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    if (autoplay) {
      handleNext();
      if (searchQuery === "") {
        scrollToCurrentSong();
      }
    } else {
      setIsPlaying(false);
    }
  };

  const toggleAutoplay = () => {
    setAutoplay(!autoplay);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRemoveSavedSong = async (id: number) => {
    await axios
      .delete("/api/public/saved-songs", {
        data: {
          video_id: id,
        },
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Video Removed from Saved Songs");
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
        <Box w="100%" mb={4}>
          <HStack
            spacing={4}
            align="stretch"
            flexDirection={{ base: "column", md: "row" }}
            flexWrap="nowrap"
          >
            <Box flex={["1", "1", "3"]}>
              {playlist.length > 0 ? (
                <AspectRatio ratio={16 / 9}>
                  <ReactPlayer
                    ref={playerRef}
                    url={playlist[currentVideo]?.url}
                    playing={isPlaying}
                    controls={true}
                    width="100%"
                    height="100%"
                    onEnded={handleVideoEnded}
                  />
                </AspectRatio>
              ) : (
                <Box height="0" paddingBottom="56.25%" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Text>No videos in playlist</Text>
                </Box>
              )}
              <HStack justifyContent="center" mt={2}>
                <HStack>
                  <Button onClick={handlePrevious} isDisabled={playlist.length === 0}><SkipBack /></Button>
                  <Button onClick={handlePlayPause} isDisabled={playlist.length === 0}>
                    {isPlaying ? <Pause /> : <Play />}
                  </Button>
                  <Button onClick={handleNext} isDisabled={playlist.length === 0}><SkipForward /></Button>
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
                <Button width={"100%"} onClick={scrollToCurrentSong}>Show Current Song</Button>
                <Button width={"100%"} onClick={toggleSort}>
                  Sort by {sortByRecent ? "Oldest" : "Most Recent"}
                </Button>
              </HStack>

              {sortedAndFilteredPlaylist.length > 0 ? (
                <>
                  <List spacing={2} overflowY="auto" maxH={["200px", "200px", "400px"]}>
                    {currentItems.map((video, index) => {
                      // Calculate the global index of the current item in the sorted and filtered list
                      const globalIndex = index + (currentPage - 1) * itemsPerPage;

                      // Check if this video is the currently playing video
                      const isSelected = playlist[currentVideo]?.url === sortedAndFilteredPlaylist[globalIndex]?.url;

                      return (
                        <ListItem
                          key={index}
                          ref={(el) => (listItemRefs.current[globalIndex] = el)}
                          onClick={() => {
                            handleVideoSelect(index);
                          }}
                          bg={isSelected ? "gray.700" : "gray.500"}
                          color={isSelected ? "white" : "black"}
                          p={3}
                          borderRadius="md"
                          boxShadow="sm"
                          cursor="pointer"
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


                  <HStack justifyContent="center" mt={4}>
                    <Button
                      onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                      isDisabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Text>{`Page ${currentPage} of ${totalPages}`}</Text>
                    <Button
                      onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                      isDisabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </HStack>

                </>
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

export const getServerSideProps = withPageAuthRequired();
