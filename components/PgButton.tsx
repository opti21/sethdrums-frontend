import { Box, Button } from "@chakra-ui/react";
import { FC } from "react";
import { Status } from "../utils/types";

type Props = {
  pgStatus: any;
  onClick: any;
  sethView?: boolean;
  width?: any;
};

type SethProps = {
  pgStatus: any;
  onClick: any;
  width?: any;
};

const PGButton: FC<Props> = ({ pgStatus, onClick, sethView, width }) => {
  if (sethView) {
    return sethPGButtons({ pgStatus, onClick, width });
  }
  const buttonWidth = ["100%", 150];
  switch (pgStatus.status) {
    case Status.NotChecked:
      return (
        <Button
          onClick={onClick}
          w={buttonWidth}
          bgGradient={"linear(to-r, #00c6ff, #0072ff)"}
          _hover={{
            bgGradient: "linear(to-l, #00c6ff, #0072ff)",
          }}
        >
          PG: Not Checked
        </Button>
      );
    case Status.BeingChecked:
      return (
        <Box
          as="button"
          onClick={onClick}
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
          onClick={onClick}
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
          onClick={onClick}
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

const sethPGButtons: FC<SethProps> = ({ pgStatus, width }) => {
  const buttonWidth = width ? width : ["100%", 120];
  switch (pgStatus.status) {
    case Status.NotChecked:
      return (
        <Button colorScheme={"blue"} w={buttonWidth}>
          Not Checked
        </Button>
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

export default PGButton;
