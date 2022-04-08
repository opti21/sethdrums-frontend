import { Button } from "@chakra-ui/react";
import { FC } from "react";
import { Status } from "../utils/types";

type Props = {
  pgStatus: any;
  onClick: any;
};

const PGButton: FC<Props> = ({ pgStatus, onClick }) => {
  switch (pgStatus.status) {
    case Status.NotChecked:
      return (
        <Button mx={2} onClick={onClick} colorScheme={"blue"} w={"100%"}>
          PG: Not Checked
        </Button>
      );
    case Status.BeingChecked:
      return (
        <Button mx={2} onClick={onClick} colorScheme={"yellow"} w={"100%"}>
          Being Checked
        </Button>
      );
    case Status.PG:
      return (
        <Button mx={2} onClick={onClick} bgColor={"green"} w={"100%"}>
          PG
        </Button>
      );
    case Status.NonPG:
      return (
        <Button mx={2} onClick={onClick} bgColor={"red"} w={"100%"}>
          Non PG
        </Button>
      );
    default:
      return (
        <Button mx={2} colorScheme={"grey"} w={"100%"} isDisabled={true}>
          PG Status
        </Button>
      );
  }
};

export default PGButton;
