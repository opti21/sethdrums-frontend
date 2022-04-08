import React, { forwardRef } from "react";

export const OverlayRequest = forwardRef(({ id, ...props }: any, ref) => {
  return (
    <div {...props} ref={ref}>
      {id}
    </div>
  );
});

OverlayRequest.displayName = "OverlayRequest";
