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
} from "@chakra-ui/react";
import axios from "axios";
import { Dispatch, FC } from "react";
import { toast } from "react-toastify";
import { useDeleteModalStore } from "../../stateStore/modalState";

type Props = {
  publicView?: boolean;
};

const DeleteModal: FC<Props> = ({ publicView }: any) => {
  const isDeleteModalOpen = useDeleteModalStore((state) => state.isOpen);
  const closeDeleteModal = useDeleteModalStore((state) => state.close);
  const deleteModalData = useDeleteModalStore((state) => state.deleteModalData);
  const request = deleteModalData.request;
  const video = deleteModalData.video;

  const handleDelete = (requestID: number) => {
    axios
      .delete(!publicView ? "/api/mod/request" : "/api/public/request", {
        data: {
          requestID,
        },
      })
      .then(async (res) => {
        toast.success("Request deleted");
        if (!publicView) {
          await axios.post("/api/mod/trigger", {
            eventName: "update-queue",
            data: {},
          });
        }
        closeDeleteModal();
      })
      .catch((err) => {
        closeDeleteModal();
        toast.error("Error deleting request");
        console.error(err);
      });
  };

  return (
    <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete Request?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text pb={4}>
            Are you sure you want to delete {publicView ? "your " : "this "}
            request?
          </Text>
          <Text
            fontSize="md"
            style={{
              fontWeight: "bold",
            }}
            noOfLines={2}
          >
            {video?.title}
          </Text>
          {!publicView && (
            <Text fontSize="md" isTruncated>
              Requested By: {request?.requested_by}
            </Text>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            bgColor="red"
            mr={3}
            onClick={() => handleDelete(parseInt(request?.id))}
          >
            Delete
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => closeDeleteModal()}
            variant="ghost"
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DeleteModal;
