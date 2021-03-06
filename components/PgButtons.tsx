import { Box, Button } from "@chakra-ui/react";
import { Video } from "@prisma/client";
import axios from "axios";
import { FC } from "react";
import {
  usePGCheckerModalStore,
  usePGConfirmModalStore,
} from "../stateStore/modalState";
import { IApiRequest, Status } from "../utils/types";

type Props = {
  request: IApiRequest;
  pgStatus: any;
  video: Video;
  sethView?: boolean;
};

type SethProps = {
  pgStatus: any;
  width?: any;
};

const PGButton: FC<Props> = ({ request, pgStatus, video }) => {
  const buttonWidth = "100%";
  const openPGConfirmModal = usePGConfirmModalStore((state) => state.open);
  const setPGData = usePGCheckerModalStore((state) => state.setPGData);
  const openPGModal = usePGCheckerModalStore((state) => state.open);

  const handlePGClick = async () => {
    setPGData({
      video: video,
      request: request,
      pgStatusID: pgStatus.id,
      currentStatus: pgStatus.status,
    });

    await axios.put("/api/mod/pg-status", {
      pgStatusID: pgStatus.id,
      status: Status.BeingChecked,
    });

    await axios.post("/api/mod/trigger", {
      eventName: "update-queue",
      data: {},
    });
    openPGModal();
  };

  switch (pgStatus.status) {
    case Status.NotChecked:
      return (
        <Box
          as="button"
          onClick={handlePGClick}
          fontWeight="bold"
          p={2}
          w={buttonWidth}
          borderRadius="md"
          bgGradient={"linear(to-r, #00c6ff, #0072ff)"}
          _hover={{
            bgGradient: "linear(to-l, #00c6ff, #0072ff)",
          }}
        >
          PG: Not Checked
        </Box>
      );
    case Status.BeingChecked:
      return (
        <Box
          as="button"
          onClick={() => {
            openPGConfirmModal();
            setPGData({
              request: request,
              video: video,
              pgStatusID: pgStatus.id,
              currentStatus: pgStatus.status,
            });
          }}
          fontWeight="bold"
          p={2}
          w={buttonWidth}
          borderRadius="md"
          color="black"
          bgGradient={"linear(to-r, #fceabb, #f8b500)"}
          _hover={{
            bgGradient: "linear(to-l, #fceabb, #f8b500)",
          }}
        >
          Being Checked
        </Box>
      );
    case Status.PG:
      return (
        <Box
          as="button"
          onClick={handlePGClick}
          fontWeight="bold"
          p={2}
          w={buttonWidth}
          borderRadius="md"
          bgGradient={"linear(to-r,  #11998e, #38ef7d)"}
          _hover={{
            bgGradient: "linear(to-l, #11998e, #38ef7d)",
          }}
        >
          PG
        </Box>
      );
    case Status.NonPG:
      return (
        <Box
          as="button"
          onClick={handlePGClick}
          fontWeight="bold"
          p={2}
          w={buttonWidth}
          borderRadius="md"
          bgGradient={"linear(to-r, #d31027, #ea384d)"}
          _hover={{
            bgGradient: "linear(to-l, #d31027, #ea384d)",
          }}
        >
          Non PG
        </Box>
      );
    default:
      return (
        <Button colorScheme={"grey"} w={buttonWidth} isDisabled={true}>
          PG Status
        </Button>
      );
  }
};

const SethPGButtons: FC<SethProps> = ({ pgStatus, width }) => {
  const buttonWidth = "100%";
  switch (pgStatus.status) {
    case Status.NotChecked:
      return (
        <Box
          as="button"
          fontWeight="bold"
          p={2}
          w={buttonWidth}
          borderRadius="md"
          bgGradient={"linear(to-r, #00c6ff, #0072ff)"}
          _hover={{
            bgGradient: "linear(to-l, #00c6ff, #0072ff)",
          }}
        >
          Not Checked
        </Box>
      );
    case Status.BeingChecked:
      return (
        <Box
          borderRadius="md"
          fontWeight="bold"
          textAlign="center"
          p={2}
          fontSize={14}
          w={buttonWidth}
          color="black"
          bgGradient={"linear(to-r, #fceabb, #f8b500)"}
        >
          Being Checked
        </Box>
      );
    case Status.PG:
      return (
        <Box
          borderRadius="md"
          fontWeight="bold"
          textAlign="center"
          p={2}
          w={buttonWidth}
          bgGradient={"linear(to-r,  #11998e, #38ef7d)"}
        >
          PG
        </Box>
      );
    case Status.NonPG:
      return (
        <Box
          borderRadius="md"
          fontWeight="bold"
          textAlign="center"
          p={2}
          w={buttonWidth}
          bgGradient={"linear(to-r, #d31027, #ea384d)"}
        >
          Non PG
        </Box>
      );
    default:
      return (
        <Button colorScheme={"grey"} w={buttonWidth} isDisabled={true}>
          PG Status
        </Button>
      );
  }
};

export { PGButton, SethPGButtons };
