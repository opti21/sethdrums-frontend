import {
  Container,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
  Button,
  ModalHeader,
  ModalBody,
  Text,
  AspectRatio,
  HStack,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  IconButton,
  ButtonGroup,
} from "@chakra-ui/react";
import axios from "axios";
import { Field, Form, Formik, FormikProps } from "formik";
import { request } from "https";
import { Dispatch, FC, useState } from "react";
import { MdCopyAll } from "react-icons/md";
import ReactPlayer from "react-player";
import { toast } from "react-toastify";
import { usePGCheckerModalStore } from "../../stateStore/modalState";
import { Status } from "../../utils/types";

const VIDEO_RATES = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const PGCheckerModal: FC = ({}: any) => {
  const isOpen = usePGCheckerModalStore((state) => state.isOpen);
  const closePGModal = usePGCheckerModalStore((state) => state.close);
  const pgData = usePGCheckerModalStore((state) => state.pgData);
  const setPGData = usePGCheckerModalStore((state) => state.setPGData);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [banLoading, setBanLoading] = useState(false);

  const updatePG = (status: string, pgStatusID: string) => {
    try {
      axios
        .put("/api/mod/pg-status", {
          pgStatusID,
          status,
        })
        .then(async (res) => {
          await axios.post("/api/mod/trigger", {
            eventName: "update-queue",
            data: {},
          });
          closePGModal();
        });
    } catch (error) {
      console.error(error);
    }
  };

  const handlePGModalClose = (pgStatusID: string) => {
    axios
      .put("/api/mod/pg-status", {
        pgStatusID,
        status: pgData.currentStatus,
      })
      .then(async (res) => {
        await axios.post("/api/mod/trigger", {
          eventName: "update-queue",
          data: {},
        });
        closePGModal();
        setPGData({
          request: null,
          video: null,
          pgStatusID: "",
          currentStatus: "",
        });
      });
  };
  const handleBan = (pgStatusID: string) => {
    setBanLoading(true);
    axios
      .post("/api/mod/videos/banned", {
        requestID: pgData.request.id,
        videoID: pgData.video.id,
      })
      .then(async (res) => {
        if (res.status === 200) {
          axios.put("/api/mod/pg-status", {
            pgStatusID,
            status: Status.NonPG,
          });

          await axios.post("/api/mod/trigger", {
            eventName: "update-queue",
            data: {},
          });
          setPGData({
            request: null,
            video: null,
            pgStatusID: "",
            currentStatus: "",
          });
          closePGModal();
          toast.success("Video banned");
        }
        setBanLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error banning video");
        setBanLoading(false);
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => handlePGModalClose(pgData.pgStatusID)}
      size="2xl"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>PG Status Checker</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <HStack py={2}>
            <IconButton
              onClick={() => {
                navigator.clipboard.writeText(pgData.video?.title);
                toast.success("Title Copied");
              }}
              icon={<MdCopyAll />}
              aria-label="Copy video title"
            />
            <Text>{pgData.video?.title}</Text>
          </HStack>
          <Text mb={2}>Requested by: {pgData.request?.requested_by}</Text>
          <AspectRatio maxW="100%" ratio={16 / 9}>
            <ReactPlayer
              url={`https://www.youtube.com/watch?v=${pgData.video?.youtube_id}`}
              height={"100%"}
              width={"100%"}
              controls={true}
              playbackRate={playbackRate}
            />
          </AspectRatio>
          <ButtonGroup mt={4} width={"100%"} justifyContent={"center"}>
            {VIDEO_RATES.map((rate, index) => {
              return (
                <Button
                  key={index}
                  minW={"10%"}
                  onClick={() => setPlaybackRate(rate)}
                  colorScheme={playbackRate === rate ? "blue" : "gray"}
                >
                  {rate}
                </Button>
              );
            })}
          </ButtonGroup>
          <Formik
            initialValues={{
              notes: pgData.video?.notes,
              videoID: pgData.video?.id,
            }}
            onSubmit={(values, actions) => {
              axios
                .post("/api/mod/videos/notes", values)
                .then(async (res) => {
                  if (res.status === 200) {
                    toast.success("Video notes updated");
                    actions.setSubmitting(false);
                  }
                })
                .catch((error) => {
                  console.error(error);
                  toast.error("Error updating video notes");
                  actions.setSubmitting(false);
                });
            }}
          >
            {(props: FormikProps<any>) => (
              <Form>
                <Field mb={2} name="notes">
                  {({ field, form }: any) => (
                    <FormControl
                      isInvalid={form.errors.notes && form.touched.notes}
                    >
                      <FormLabel mt={4} htmlFor="notes">
                        Video Notes
                      </FormLabel>

                      <Textarea {...field} id="notes" placeholder="Notes" />
                      <FormErrorMessage>{form.errors.notes}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                <Button
                  mt={4}
                  mb={2}
                  colorScheme="teal"
                  isLoading={props.isSubmitting}
                  type="submit"
                >
                  Submit
                </Button>
              </Form>
            )}
          </Formik>
          <HStack pt="4">
            <Button
              onClick={() => updatePG("PG", pgData.pgStatusID)}
              bgColor="green"
              w="100%"
            >
              PG
            </Button>
            <Button
              onClick={() => updatePG("NON_PG", pgData.pgStatusID)}
              bgColor="red"
              w="100%"
            >
              NON PG
            </Button>
            <Popover placement="top">
              <PopoverTrigger>
                <Button colorScheme={"red"} w="25%" variant={"link"}>
                  BAN
                </Button>
              </PopoverTrigger>
              <PopoverContent color="white" bg="red.900">
                <PopoverArrow bg="red.900" />
                <PopoverCloseButton />
                <PopoverHeader>Are you sure you want to ban?</PopoverHeader>
                <PopoverBody>
                  <Text my={2}>
                    Make sure you add ban reason to video notes.
                  </Text>
                  <Button
                    my={2}
                    onClick={() => {
                      handleBan(pgData.pgStatusID);
                    }}
                    colorScheme="red"
                    w="100%"
                    isLoading={banLoading}
                  >
                    BAN
                  </Button>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PGCheckerModal;
