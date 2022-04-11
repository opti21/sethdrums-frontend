import { Button } from "@chakra-ui/react";
import { FC } from "react";
import { Status } from "../utils/types";

type Props = {
  pgStatus: any;
  onClick: any;
};

const PGButton: FC<Props> = ({ pgStatus, onClick }) => {
  const width = ["100%", "100%"];
  switch (pgStatus.status) {
    case Status.NotChecked:
      return (
        <Button onClick={onClick} colorScheme={"blue"} w={width}>
          PG: Not Checked
        </Button>
      );
    case Status.BeingChecked:
      return (
        <Button onClick={onClick} colorScheme={"yellow"} w={width}>
          Being Checked
        </Button>
      );
    case Status.PG:
      return (
        <Button onClick={onClick} bgColor={"green"} w={width}>
          PG
        </Button>
      );
    case Status.NonPG:
      return (
        <Button onClick={onClick} bgColor={"red"} w={width}>
          Non PG
        </Button>
      );
    default:
      return (
        <Button colorScheme={"grey"} w={width} isDisabled={true}>
          PG Status
        </Button>
      );
  }
};

export default PGButton;
