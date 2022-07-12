import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
} from "@chakra-ui/react";
import { Dispatch, FC, useState } from "react";
import ReactAudioPlayer from "react-audio-player";
import { useFartModalStore } from "../../stateStore/modalState";

const FartModal: FC = ({}: any) => {
  const isOpen = useFartModalStore((state) => state.isOpen);
  const closeFartModal = useFartModalStore((state) => state.close);

  return (
    <Modal isOpen={isOpen} onClose={closeFartModal} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>You found it!</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ReactAudioPlayer src="/drama_fart.ogg" autoPlay volume={0.5} />
          {"Here's your prize."}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default FartModal;
