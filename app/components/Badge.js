import React, { forwardRef } from "react";
import { tv } from "tailwind-variants";

import { cx } from "./utils";

const badgeVariants = tv({
  base: cx(
    "inline-flex items-center gap-x-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ring-1"
  ),
  variants: {
    variant: {
      default: [
        "bg-[#24B8EE75] text-[#008767] ring-[#24B8EE75]",
        "dark:bg-[#24B8EE75] dark:text-[#008767] dark:ring-[#24B8EE75]",
      ],
      neutral: [
        "bg-gray-50 text-gray-700 ring-gray-500/30",
        "dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20",
      ],
      success: [
        "bg-emerald-50 text-emerald-800 ring-emerald-600/30",
        "dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
      ],
      error: [
        "bg-[#FFC5C5B2] text-[#DF0404] ring-[#FFC5C5B2]",
        "dark:bg-[#FFC5C5B2] dark:text-[#DF0404] dark:ring-[#FFC5C5B2]",
      ],
      warning: [
        "bg-yellow-50 text-yellow-800 ring-yellow-600/30",
        "dark:bg-yellow-400/10 dark:text-yellow-500 dark:ring-yellow-400/20",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const Badge = forwardRef(({ className, variant, ...props }, forwardedRef) => {
  return (
    <span
      ref={forwardedRef}
      className={cx(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
