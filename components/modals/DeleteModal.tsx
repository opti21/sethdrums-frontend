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

type Props = {
  isDeleteModalOpen: boolean;
  closeDeleteModal: () => void;
  deleteModalData: {
    request: any;
    video: any;
  };
  setDeleteModalData: Dispatch<any>;
  publicView?: boolean;
};

const DeleteModal: FC<Props> = ({
  isDeleteModalOpen,
  closeDeleteModal,
  deleteModalData,
  setDeleteModalData,
  publicView,
}: any) => {
  const request = deleteModalData.request;
  const video = deleteModalData.video;

  const handleDelete = (requestID: string) => {
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
        setDeleteModalData({
          request: null,
          video: null,
        });
      })
      .catch((err) => {
        closeDeleteModal();
        setDeleteModalData({
          request: null,
          video: null,
        });
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
          <Text pb={4}>Are you sure you want to delete this request? </Text>
          <Text
            fontSize="md"
            style={{
              fontWeight: "bold",
            }}
            noOfLines={2}
          >
            {video?.title}
          </Text>
          <Text fontSize="md" isTruncated>
            Requested By: {request?.requested_by}
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button
            bgColor="red"
            mr={3}
            onClick={() => handleDelete(request?.id)}
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
