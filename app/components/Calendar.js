"use client";

import React, { forwardRef, useRef } from "react";
import { DayPicker, useDayPicker } from "react-day-picker";
import { cx, focusRing } from "./utils";
import { ArrowLeft, ArrowRight, MoveLeft, MoveRight } from "lucide-react";
import { addYears, format, isSameMonth } from "date-fns";
import {
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "react-icons/ri";


import "react-day-picker/dist/style.css";

const NavigationButton = forwardRef(
  ({ onClick, icon, disabled, ...props }, forwardedRef) => {
    const Icon = icon;
    return (
      <button
        ref={forwardedRef}
        type="button"
        disabled={disabled}
        className={cx(
          "flex size-8 shrink-0 select-none items-center justify-center rounded-sm border p-1 outline-hidden transition sm:size-[30px]",
          // text color
          "text-gray-600 hover:text-gray-800",
          "dark:text-gray-400 dark:hover:text-gray-200",
          // border color
          "border-gray-300 dark:border-gray-800",
          // background color
          "hover:bg-gray-50 active:bg-gray-100",
          "dark:hover:bg-gray-900 dark:active:bg-gray-800",
          // disabled
          "disabled:pointer-events-none",
          "disabled:border-gray-200 dark:disabled:border-gray-800",
          "disabled:text-gray-400 dark:disabled:text-gray-600",
          focusRing
        )}
        onClick={onClick}
        {...props}
      >
        <Icon className="size-full shrink-0" />
      </button>
    );
  }
);

NavigationButton.displayName = "NavigationButton";

const Calendar = ({
  mode = "single",
  weekStartsOn = 1,
  numberOfMonths = 1,
  enableYearNavigation = false,
  disableNavigation,
  locale,
  className,
  classNames,
  ...props
}) => {
 

  return (
    <DayPicker
      mode={mode}
      weekStartsOn={weekStartsOn}
      numberOfMonths={numberOfMonths}
      locale={locale}
      showOutsideDays={numberOfMonths === 1}
      className={cx(className, "p-3")}
      classNames={{
        months: "flex space-y-0",
        month: "space-y-4 p-3",
        nav: "gap-1 flex items-center rounded-full size-full justify-between p-4",
        month_grid: "w-full border-collapse space-y-1",
        weekday:
          "w-9 font-medium text-sm sm:text-xs text-center text-gray-400 dark:text-gray-600 pb-2",
        week: "w-full mt-0.5",
        day: cx(
          "relative p-0 text-center focus-within:relative",
          "text-gray-900 dark:text-gray-50"
        ),
        day_button: cx(
          "size-9 rounded-sm text-sm focus:z-10",
          "text-gray-900 dark:text-gray-50",
          "hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          focusRing
        ),
        today: "font-semibold",
        selected: cx(
          "rounded-sm",
          "aria-selected:bg-blue-500 aria-selected:text-white",
          "dark:aria-selected:bg-blue-500 dark:aria-selected:text-white"
        ),
        disabled:
          "text-gray-300! dark:text-gray-700! line-through disabled:hover:bg-transparent",
        outside: "text-gray-400 dark:text-gray-600",
        range_middle: cx(
          "rounded-none!",
          "aria-selected:bg-gray-100! aria-selected:text-gray-900!",
          "dark:aria-selected:bg-gray-900! dark:aria-selected:text-gray-50!"
        ),
        range_start: "rounded-r-none rounded-l!",
        range_end: "rounded-l-none rounded-r!",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ArrowLeft aria-hidden="true" className="size-4" />;
          }
          return <ArrowRight aria-hidden="true" className="size-4" />;
        },
        MonthCaption: ({ calendarMonth, displayIndex }) => {
          const dayPicker = useDayPicker();
          const {
            months,
            formatters,
            dayPickerProps,
            goToMonth,
            numberOfMonths,
            labels,
            fromDate,
            toDate,
          } = dayPicker;

          // Extract navigation functions from the dayPicker context
          const { weeks, date } = calendarMonth;
          const previousMonth = new Date(date);
          previousMonth.setMonth(previousMonth.getMonth() - 1);

          const nextMonth = new Date(date);
          nextMonth.setMonth(nextMonth.getMonth() + 1);

          // Determine if previous/next navigation should be disabled
          const isPreviousDisabled = fromDate && previousMonth < fromDate;
          const isNextDisabled = toDate && nextMonth > toDate;

          // We're simplifying multi-month display logic for this implementation
          const hidePreviousButton = false;
          const hideNextButton = false;

          const goToPreviousYear = () => {
            const targetMonth = addYears(date, -1);
            if (!fromDate || targetMonth >= fromDate) {
              goToMonth(targetMonth);
            }
          };

          const goToNextYear = () => {
            const targetMonth = addYears(date, 1);
            if (!toDate || targetMonth <= toDate) {
              goToMonth(targetMonth);
            }
          };

          return (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {enableYearNavigation && !hidePreviousButton && (
                  <NavigationButton
                    disabled={
                      disableNavigation ||
                      (fromDate && addYears(date, -1) < fromDate)
                    }
                    aria-label="Previous Year"
                    onClick={goToPreviousYear}
                    icon={RiArrowLeftDoubleLine}
                  />
                )}
                {!hidePreviousButton && (
                  <NavigationButton
                    disabled={disableNavigation || isPreviousDisabled}
                    aria-label="Previous Month"
                    onClick={() => goToMonth(previousMonth)}
                    icon={RiArrowLeftSLine}
                  />
                )}
              </div>

              <div
                role="presentation"
                aria-live="polite"
                className="text-sm font-medium capitalize tabular-nums text-gray-900 dark:text-gray-50"
              >
                {format(date, "LLLL yyyy", { locale })}
              </div>

              <div className="flex items-center gap-1">
                {!hideNextButton && (
                  <NavigationButton
                    disabled={disableNavigation || isNextDisabled}
                    aria-label="Next Month"
                    onClick={() => goToMonth(nextMonth)}
                    icon={RiArrowRightSLine}
                  />
                )}
                {enableYearNavigation && !hideNextButton && (
                  <NavigationButton
                    disabled={
                      disableNavigation ||
                      (toDate && addYears(date, 1) > toDate)
                    }
                    aria-label="Next Year"
                    onClick={goToNextYear}
                    icon={RiArrowRightDoubleLine}
                  />
                )}
              </div>
            </div>
          );
        },
      }}
      tremor-id="tremor-raw"
      {...props}
    />
  );
};

Calendar.displayName = "Calendar";

export { Calendar };
