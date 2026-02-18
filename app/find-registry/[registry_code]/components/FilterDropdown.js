"use client";
import React, { useState, useRef, useEffect } from "react";
import { CircleChevronDown } from "lucide-react";

export default function FilterDropdown({
  label,
  options = [],
  value,
  onChange,
  placeholder,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#A5914B] cursor-pointer text-sm px-4 py-2 flex items-center gap-1 hover:bg-[#A5914B]/5 rounded-lg transition-colors"
      >
        {label}
        {selectedOption && (
          <span className="font-medium ml-1">: {selectedOption.label}</span>
        )}
        <CircleChevronDown
          className={`fill-[#A5914B] text-white size-5 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] py-2">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange?.(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer ${
                !value ? "text-[#A5914B] font-medium" : "text-gray-600"
              }`}
            >
              {placeholder}
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange?.(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer ${
                value === option.value
                  ? "text-[#A5914B] font-medium"
                  : "text-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
