import React, { forwardRef } from "react";
import { tv } from "tailwind-variants";

import { cx } from "./utils";

const progressBarVariants = tv({
  slots: {
    background: "",
    bar: "",
  },
  variants: {
    variant: {
      default: {
        background: "bg-slate-300 dark:bg-slate-300",
        bar: "bg-[#247ACB]  dark:bg-[#247ACB] ",
      },
      neutral: {
        background: "bg-gray-200 dark:bg-gray-500/40",
        bar: "bg-gray-500 dark:bg-gray-500",
      },
      warning: {
        background: "bg-yellow-200 dark:bg-yellow-500/30",
        bar: "bg-yellow-500 dark:bg-yellow-500",
      },
      error: {
        background: "bg-red-200 dark:bg-red-500/30",
        bar: "bg-red-500 dark:bg-red-500",
      },
      success: {
        background: "bg-[#D9D9D9] dark:bg-[#D9D9D9",
        bar: "bg-[#00dfff] dark:bg-[#00dfff]",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const ProgressBar = forwardRef(
  (
    { value, max, label, showAnimation = false, variant, className, ...props },
    forwardedRef
  ) => {
    const safeValue = Math.min(max, Math.max(value, 0));
    const { background, bar } = progressBarVariants({ variant });

    return (
      <div
        ref={forwardedRef}
        className={cx("flex w-full items-center", className)}
        role="progressbar"
        aria-label="label"
        aria-valuenow={value}
        aria-valuemax={max}
        tremor-id="tremor-raw"
        {...props}
      >
        <div
          className={cx(
            "relative flex h-2 w-full items-center rounded-full",
            background()
          )}
        >
          <div
            className={cx(
              "h-full flex-col rounded-full",
              bar(),
              showAnimation &&
                "transform-gpu transition-all duration-300 ease-in-out"
            )}
            style={{
              width: max ? `${(safeValue / max) * 100}%` : `${safeValue}%`,
            }}
          />
        </div>
        {label ? (
          <span
            className={cx(
              // base
              "ml-2 whitespace-nowrap text-sm font-medium leading-none",
              // text color
              "text-gray-900 dark:text-gray-50"
            )}
          >
            {label}
          </span>
        ) : null}
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export { ProgressBar, progressBarVariants };
