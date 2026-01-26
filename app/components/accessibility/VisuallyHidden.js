"use client";
import React from "react";

export default function VisuallyHidden({ as: Component = "span", children, ...props }) {
  return (
    <Component className="sr-only" {...props}>
      {children}
    </Component>
  );
}
