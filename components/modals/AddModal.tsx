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
} from "@chakra-ui/react";
import { Status } from "@prisma/client";
import axios from "axios";
import { Field, Form, Formik, FormikProps } from "formik";
import { request } from "https";
import { Dispatch, FC, useState } from "react";
import ReactPlayer from "react-player";
import { toast } from "react-toastify";
import { useAddRequestModalStore } from "../../stateStore/modalState";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import { IQueue } from "../../utils/types";

type Props = {
  queue: IQueue;
};

const AddModal: FC<Props> = ({ queue }) => {
  const isOpen = useAddRequestModalStore((state) => state.isOpen);
  const closeAddModal = useAddRequestModalStore((state) => state.close);

  const validateYTUrl = (value: string) => {
    let error;
    const parsed = urlParser.parse(value);
    const alreadyRequested = queue.order.findIndex((request) => {
      return request.Video.youtube_id === parsed?.id;
    });

    if (!value) {
      error = "Youtube link required";
    } else if (!parsed) {
      error = "Not valid youtube URL";
    } else if (alreadyRequested != -1) {
      error = "Video is already in the queue";
    }

    return error;
  };

  const validateRequestedBy = (value: string) => {
    let error;

    if (!value) {
      error = "Name required";
    }

    return error;
  };

  return (
    <Modal isOpen={isOpen} onClose={closeAddModal} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Video</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Formik
            initialValues={{ ytLink: "", requestedBy: "" }}
            onSubmit={(values, actions) => {
              axios
                .post("/api/mod/request", values)
                .then(async (res) => {
                  if (res.status === 200) {
                    await axios.post("/api/mod/trigger", {
                      eventName: "update-queue",
                      data: {},
                    });
                    closeAddModal();
                    actions.setSubmitting(false);
                    toast.success("Request added");
                  }
                })
                .catch((error) => {
                  actions.setSubmitting(false);
                  toast.error(error.response.data.error);
                  console.error(error.response.data);
                  return;
                });
            }}
          >
            {(props: FormikProps<any>) => (
              <Form>
                <Field name="ytLink" validate={validateYTUrl}>
                  {({ field, form }: any) => (
                    <FormControl
                      isInvalid={form.errors.ytLink && form.touched.ytLink}
                      isRequired={true}
                    >
                      <FormLabel htmlFor="youtube-link">Youtube Link</FormLabel>

                      <Input
                        {...field}
                        id="youtube-link"
                        placeholder="https://www.youtube.com/watch?v=ECSNqKsY_T4"
                      />
                      <FormErrorMessage>{form.errors.ytLink}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                <Field mb={2} name="requestedBy" validate={validateRequestedBy}>
                  {({ field, form }: any) => (
                    <FormControl
                      isInvalid={
                        form.errors.requestedBy && form.touched.requestedBy
                      }
                      isRequired={true}
                    >
                      <FormLabel mt={4} htmlFor="requested-by">
                        Requested By
                      </FormLabel>

                      <Input
                        {...field}
                        id="requested-by"
                        placeholder="username"
                      />
                      <FormErrorMessage>
                        {form.errors.requestedBy}
                      </FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                <AspectRatio mt={4} maxW="100%" ratio={16 / 9}>
                  <ReactPlayer
                    url={props.values.ytLink}
                    height={"100%"}
                    width={"100%"}
                    controls={true}
                  />
                </AspectRatio>
                <Button
                  id="submit-request-btn"
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default AddModal;
