"use client";
import React from "react";
import SalesTrendChart from "./SalesTrendChart";
import TopCategoriesChart from "./TopCategoriesChart";

export function SalesTrendSection({ data }) {
  return (
    <div className="h-[220px] w-full">
      <SalesTrendChart data={data} />
    </div>
  );
}

export function TopCategoriesSection({ data }) {
  return (
    <div className="h-[200px] w-full">
      <TopCategoriesChart data={data} />
    </div>
  );
}
