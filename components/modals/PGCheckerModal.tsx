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
} from "@chakra-ui/react";
import axios from "axios";
import { Field, Form, Formik, FormikProps } from "formik";
import { Dispatch, FC } from "react";
import ReactPlayer from "react-player";
import { toast } from "react-toastify";
import { usePGCheckerModalStore } from "../../stateStore/modalState";

const PGCheckerModal: FC = ({}: any) => {
  const isOpen = usePGCheckerModalStore((state) => state.isOpen);
  const closePGModal = usePGCheckerModalStore((state) => state.close);
  const pgData = usePGCheckerModalStore((state) => state.pgData);
  const setPGData = usePGCheckerModalStore((state) => state.setPGData);

  const updatePG = (status: string, pgStatusID: string) => {
    try {
      console.log("update pg");
      axios
        .put("/api/mod/pg-status", {
          pgStatusID,
          status,
        })
        .then(async (res) => {
          console.log("pg updated");
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
        console.log("pg updated");
        await axios.post("/api/mod/trigger", {
          eventName: "update-queue",
          data: {},
        });
        closePGModal();
        setPGData({
          requestID: "",
          youtubeID: "",
          pgStatusID: "",
          currentStatus: "",
        });
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
          {/* TODO: Handle PG/ban notes */}

          <Formik
            initialValues={{ ytLink: "", requestedBy: "" }}
            onSubmit={(values, actions) => {
              axios
                .post("/api/mod/request", values)
                .then(async (res) => {
                  // console.log(res.data);
                  if (res.status === 200) {
                    toast.success("Ban notes updated");
                  }
                })
                .catch((error) => {
                  console.error(error);
                  toast.error("Error submitting request");
                  actions.setSubmitting(false);
                });
            }}
          >
            {(props: FormikProps<any>) => (
              <Form>
                <Field mb={2} name="requestedBy">
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
            <Button
              onClick={() => {}}
              w="25%"
              colorScheme={"red"}
              variant={"link"}
            >
              BAN
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PGCheckerModal;
