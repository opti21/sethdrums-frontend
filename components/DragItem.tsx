import { Box } from "@chakra-ui/react";
import { forwardRef } from "react";

const DragItem = forwardRef(({ id, ...props }: any, ref) => {
  return (
    <Box
      {...props}
      border="1px"
      h={20}
      w={20}
      borderColor="pink.200"
      bgColor={"pink"}
      ref={ref}
    >
      Video
    </Box>
  );
});

DragItem.displayName = "Drag Item";

export default DragItem;
