import React, { forwardRef } from "react";
import * as TooltipPrimitives from "@radix-ui/react-tooltip";
import { tv } from "tailwind-variants";

import { cx } from "./utils";

const tooltipStyles = tv({
  slots: {
    content: [
      "z-50 rounded-md border px-2.5 py-1.5 text-xs shadow-lg", // base
      "bg-gray-900 text-gray-50 border-gray-800", // colors
    ],
    arrow: [
      "fill-gray-900",
    ],
  },
});

const { content, arrow } = tooltipStyles();

const TooltipProvider = TooltipPrimitives.Provider;

const Tooltip = TooltipPrimitives.Root;

const TooltipTrigger = TooltipPrimitives.Trigger;

const TooltipContent = forwardRef(
  ({ className, sideOffset = 6, ...props }, forwardedRef) => {
    return (
      <TooltipPrimitives.Content
        ref={forwardedRef}
        sideOffset={sideOffset}
        className={cx(content(), className)}
        {...props}
      >
        {props.children}
        <TooltipPrimitives.Arrow className={cx(arrow())} />
      </TooltipPrimitives.Content>
    );
  }
);

TooltipContent.displayName = "TooltipContent";

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
