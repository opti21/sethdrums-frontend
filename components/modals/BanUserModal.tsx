import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
  Button,
  ModalHeader,
  ModalBody,
  Text,
  Textarea,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import axios from "axios";
import { FC, useState } from "react";
import { toast } from "react-toastify";
import { useBanUserModalStore } from "../../stateStore/modalState";

const BanUserModal: FC = () => {
  const isOpen = useBanUserModalStore((state) => state.isOpen);
  const close = useBanUserModalStore((state) => state.close);
  const banUserData = useBanUserModalStore((state) => state.banUserData);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBan = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/mod/users/banned", {
        twitch_id: banUserData.twitch_id,
        twitch_username: banUserData.twitch_username,
        reason: reason || null,
      });

      if (res.status === 200) {
        await axios.post("/api/mod/trigger", {
          eventName: "update-queue",
          data: {},
        });
        toast.success(
          `User banned. ${res.data.removedRequests} request(s) removed.`
        );
        setReason("");
        close();
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error("User is already banned");
      } else {
        toast.error("Error banning user");
        console.error(err);
      }
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setReason("");
    close();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Ban User from Requesting?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text pb={4}>
            Are you sure you want to ban{" "}
            <b>{banUserData.twitch_username}</b> from making song requests?
          </Text>
          <Text pb={4} fontSize="sm" color="orange.300">
            This will also remove all their pending requests from the queue.
          </Text>
          <FormControl>
            <FormLabel>Reason (optional)</FormLabel>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter ban reason..."
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button
            bgColor="red"
            mr={3}
            onClick={handleBan}
            isLoading={isLoading}
          >
            Ban User
          </Button>
          <Button colorScheme="blue" onClick={handleClose} variant="ghost">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BanUserModal;
