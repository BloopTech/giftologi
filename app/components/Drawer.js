import React, { forwardRef } from "react";
import * as DrawerPrimitives from "@radix-ui/react-dialog";

import { cx, focusRing } from "./utils";
import { CircleX } from "lucide-react";

const Drawer = (props) => {
  return <DrawerPrimitives.Root {...props} />;
};
Drawer.displayName = "Drawer";

const DrawerTrigger = forwardRef(({ className, ...props }, ref) => {
  return (
    <DrawerPrimitives.Trigger ref={ref} className={cx(className)} {...props} />
  );
});
DrawerTrigger.displayName = "Drawer.Trigger";

const DrawerClose = forwardRef(({ className, ...props }, ref) => {
  return (
    <DrawerPrimitives.Close ref={ref} className={cx(className)} {...props} />
  );
});
DrawerClose.displayName = "Drawer.Close";

const DrawerPortal = DrawerPrimitives.Portal;

DrawerPortal.displayName = "DrawerPortal";

const DrawerOverlay = forwardRef(({ className, ...props }, forwardedRef) => {
  return (
    <DrawerPrimitives.Overlay
      ref={forwardedRef}
      className={cx(
        // base
        "fixed inset-0 z-50 overflow-y-auto",
        // background color
        "bg-black/30",
        // transition
        "data-[state=closed]:animate-hide data-[state=open]:animate-dialogOverlayShow",
        className
      )}
      {...props}
      style={{
        animationDuration: "400ms",
        animationFillMode: "backwards",
      }}
    />
  );
});

DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = forwardRef(({ className, ...props }, forwardedRef) => {
  return (
    <DrawerPortal>
      <DrawerOverlay>
        <DrawerPrimitives.Content
          ref={forwardedRef}
          className={cx(
            // base
            "fixed inset-y-2 mx-auto flex w-[95vw] flex-1 flex-col overflow-y-auto rounded-md border p-4 shadow-lg focus:outline-none max-sm:inset-x-2 sm:inset-y-2 sm:right-2 sm:max-w-lg sm:p-6",
            // border color
            "border-gray-200 dark:border-gray-900",
            // background color
            "bg-white dark:bg-[#090E1A]",
            // transition
            "data-[state=closed]:animate-drawerSlideRightAndFade data-[state=open]:animate-drawerSlideLeftAndFade",
            focusRing,
            className
          )}
          {...props}
        />
      </DrawerOverlay>
    </DrawerPortal>
  );
});

DrawerContent.displayName = "DrawerContent";

const DrawerHeader = forwardRef(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className="flex items-start justify-between gap-x-4 border-b border-gray-200 pb-4 dark:border-gray-900"
      {...props}
    >
      <div className={cx("mt-1 flex flex-col gap-y-1", className)}>
        {children}
      </div>
      <DrawerPrimitives.Close asChild>
        <button
          //variant="ghost"
          className="aspect-square p-1 hover:bg-gray-100 hover:dark:bg-gray-400/10 dark:text-white"
        >
          <CircleX className="size-6" aria-hidden="true" />
        </button>
      </DrawerPrimitives.Close>
    </div>
  );
});

DrawerHeader.displayName = "Drawer.Header";

const DrawerTitle = forwardRef(({ className, ...props }, forwardedRef) => (
  <DrawerPrimitives.Title
    ref={forwardedRef}
    className={cx(
      // base
      "text-base font-semibold",
      // text color
      "text-gray-900 dark:text-gray-50",
      className
    )}
    {...props}
  />
));

DrawerTitle.displayName = "DrawerTitle";

const DrawerBody = forwardRef(({ className, ...props }, ref) => {
  return <div ref={ref} className={cx("flex-1 py-4", className)} {...props} />;
});

DrawerBody.displayName = "Drawer.Body";

const DrawerDescription = forwardRef(
  ({ className, ...props }, forwardedRef) => {
    return (
      <DrawerPrimitives.Description
        ref={forwardedRef}
        className={cx("text-gray-500 dark:text-gray-500", className)}
        {...props}
      />
    );
  }
);

DrawerDescription.displayName = "DrawerDescription";

const DrawerFooter = ({ className, ...props }) => {
  return (
    <div
      className={cx(
        "flex flex-col-reverse border-t border-gray-200 pt-4 sm:flex-row sm:justify-end sm:space-x-2 dark:border-gray-900",
        className
      )}
      {...props}
    />
  );
};

DrawerFooter.displayName = "DrawerFooter";

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
