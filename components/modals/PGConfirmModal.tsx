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
import {
  usePGCheckerModalStore,
  usePGConfirmModalStore,
} from "../../stateStore/modalState";

const PGConfirmModal: FC = ({}: any) => {
  const isOpen = usePGConfirmModalStore((state) => state.isOpen);
  const closePGConfirmModal = usePGConfirmModalStore((state) => state.close);
  const openPGCheckerModal = usePGCheckerModalStore((state) => state.open);
  const setPGData = usePGCheckerModalStore((state) => state.setPGData);

  const handlePGConfirmClose = () => {
    closePGConfirmModal();
    setPGData({
      requestID: "",
      youtubeID: "",
      pgStatusID: "",
      currentStatus: "",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={closePGConfirmModal}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Uh Oh!</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text pb={4}>
            Looks like someone is already checking the PG Status. Are you sure
            you want to check the status?
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme={"green"}
            mr={3}
            onClick={() => {
              closePGConfirmModal();
              openPGCheckerModal();
            }}
          >
            YEP
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => handlePGConfirmClose()}
            variant="ghost"
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PGConfirmModal;
