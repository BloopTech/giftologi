"use client";
import React, { useState, useMemo, useCallback } from "react";
import ReactSelect from "react-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { PiX } from "react-icons/pi";
import { Plus } from "lucide-react";

const SUBCATEGORY_COLORS = [
  "#5CAE2D", "#2563EB", "#D97706", "#DC2626", "#7C3AED",
  "#0891B2", "#BE185D", "#059669", "#EA580C", "#4F46E5",
];

function getColorForIndex(idx) {
  return SUBCATEGORY_COLORS[idx % SUBCATEGORY_COLORS.length];
}

/**
 * CascadingCategoryPicker
 *
 * Props:
 *  - categories: flat array of { id, name, parent_category_id }
 *  - selectedCategoryIds: string[]
 *  - onToggleCategory: (categoryId: string) => void
 *  - onClearAll?: () => void
 *  - disabled?: boolean
 *  - error?: string
 */
export default function CascadingCategoryPicker({
  categories = [],
  selectedCategoryIds = [],
  onToggleCategory,
  onClearAll,
  disabled = false,
  error,
}) {
  const [selectedParentId, setSelectedParentId] = useState("");
  const [pendingSubIds, setPendingSubIds] = useState([]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const parentCategories = useMemo(() => {
    return (categories || [])
      .filter((c) => !c.parent_category_id)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [categories]);

  const childrenByParentId = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => {
      if (!c.parent_category_id) return;
      const list = map.get(c.parent_category_id) || [];
      list.push(c);
      map.set(c.parent_category_id, list);
    });
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      map.set(key, list);
    }
    return map;
  }, [categories]);

  const selectedIdSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds],
  );

  const getCategoryDisplayName = useCallback(
    (category) => {
      if (!category) return "Untitled";
      const name = category.name || "Untitled";
      const parentId = category.parent_category_id;
      if (!parentId) return name;
      const parent = categoriesById.get(parentId);
      if (!parent) return name;
      return `${parent.name || "Untitled"} / ${name}`;
    },
    [categoriesById],
  );

  const handleParentSelect = useCallback((value) => {
    if (!value) return;
    setSelectedParentId(value);
    setPendingSubIds([]);
  }, []);

  const handleAddCategories = useCallback(() => {
    if (!selectedParentId) return;
    const children = childrenByParentId.get(selectedParentId) || [];
    if (children.length === 0) {
      if (!selectedIdSet.has(selectedParentId)) {
        onToggleCategory(selectedParentId);
      }
    } else {
      if (pendingSubIds.length > 0) {
        pendingSubIds.forEach((id) => {
          if (!selectedIdSet.has(id)) {
            onToggleCategory(id);
          }
        });
      }
    }
    setSelectedParentId("");
    setPendingSubIds([]);
  }, [selectedParentId, pendingSubIds, childrenByParentId, selectedIdSet, onToggleCategory]);

  const handleCancel = useCallback(() => {
    setSelectedParentId("");
    setPendingSubIds([]);
  }, []);

  const subcategoryOptions = useMemo(() => {
    if (!selectedParentId) return [];
    const children = childrenByParentId.get(selectedParentId) || [];
    return children.map((child, idx) => ({
      value: child.id,
      label: child.name || "Untitled",
      color: getColorForIndex(idx),
    }));
  }, [selectedParentId, childrenByParentId]);

  const pendingSubValues = useMemo(() => {
    return subcategoryOptions.filter((opt) => pendingSubIds.includes(opt.value));
  }, [subcategoryOptions, pendingSubIds]);

  const selectedParent = selectedParentId ? categoriesById.get(selectedParentId) : null;
  const hasChildren = selectedParent ? (childrenByParentId.get(selectedParentId) || []).length > 0 : false;

  const selectStyles = useMemo(() => ({
    control: (base, state) => ({
      ...base,
      minHeight: "36px",
      fontSize: "12px",
      borderColor: state.isFocused ? "#5CAE2D" : "#D1D5DB",
      boxShadow: state.isFocused ? "0 0 0 1px #5CAE2D" : "none",
      "&:hover": { borderColor: "#5CAE2D" },
      borderRadius: "8px",
    }),
    multiValue: (base, { data }) => ({
      ...base,
      backgroundColor: data.color ? `${data.color}18` : "#F3F4F6",
      borderRadius: "9999px",
      border: `1px solid ${data.color || "#D1D5DB"}`,
    }),
    multiValueLabel: (base, { data }) => ({
      ...base,
      color: data.color || "#374151",
      fontSize: "11px",
      fontWeight: 500,
      padding: "2px 6px",
    }),
    multiValueRemove: (base, { data }) => ({
      ...base,
      color: data.color || "#9CA3AF",
      borderRadius: "0 9999px 9999px 0",
      "&:hover": {
        backgroundColor: data.color ? `${data.color}30` : "#E5E7EB",
        color: data.color || "#374151",
      },
    }),
    option: (base, state) => ({
      ...base,
      fontSize: "12px",
      backgroundColor: state.isSelected ? "#5CAE2D" : state.isFocused ? "#F0FDF4" : "white",
      color: state.isSelected ? "white" : "#374151",
      "&:active": { backgroundColor: "#5CAE2D20" },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      zIndex: 50,
    }),
    placeholder: (base) => ({
      ...base,
      fontSize: "12px",
      color: "#9CA3AF",
    }),
  }), []);

  return (
    <div className="flex flex-col gap-3">
      {/* Selected chips */}
      {selectedCategoryIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCategoryIds.map((id) => {
            const cat = categoriesById.get(id);
            if (!cat) return null;
            const parentId = cat.parent_category_id;
            const siblings = parentId ? (childrenByParentId.get(parentId) || []) : [];
            const siblingIdx = siblings.findIndex((s) => s.id === id);
            const chipColor = parentId && siblingIdx >= 0 ? getColorForIndex(siblingIdx) : "#6B7280";
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: `${chipColor}15`,
                  color: chipColor,
                  border: `1px solid ${chipColor}40`,
                }}
              >
                {getCategoryDisplayName(cat)}
                <button
                  type="button"
                  onClick={() => onToggleCategory(id)}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  disabled={disabled}
                  aria-label={`Remove ${getCategoryDisplayName(cat)}`}
                >
                  <PiX className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {onClearAll && selectedCategoryIds.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-[#6A7282] hover:text-[#0A0A0A] ml-1"
              disabled={disabled}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Parent category picker — visible when NOT picking subcategories */}
      {!selectedParentId && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[#374151]">
            Select a category
          </label>
          <Select
            value=""
            onValueChange={handleParentSelect}
            disabled={disabled || parentCategories.length === 0}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder={
                parentCategories.length === 0
                  ? "No categories available"
                  : "Choose a category..."
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectGroupLabel>Categories</SelectGroupLabel>
                {parentCategories.map((parent) => {
                  const childCount = (childrenByParentId.get(parent.id) || []).length;
                  return (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.name || "Untitled"}
                      {childCount > 0 && (
                        <span className="text-[#9CA3AF] ml-1">
                          ({childCount} sub)
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Subcategory multi-select — visible when a parent is selected */}
      {selectedParentId && selectedParent && (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#111827]">
              {selectedParent.name || "Untitled"}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-[11px] text-[#9CA3AF] hover:text-red-500 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {hasChildren ? (
            <>
              <ReactSelect
                isMulti
                options={subcategoryOptions}
                value={pendingSubValues}
                onChange={(selected) => {
                  setPendingSubIds((selected || []).map((s) => s.value));
                }}
                placeholder="Select subcategories..."
                isDisabled={disabled}
                styles={selectStyles}
                noOptionsMessage={() => "No subcategories"}
                closeMenuOnSelect={false}
              />
              <button
                type="button"
                onClick={handleAddCategories}
                disabled={disabled || pendingSubIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add {pendingSubIds.length > 0 ? `(${pendingSubIds.length})` : ""}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-[#6B7280]">
                No subcategories. Add as a top-level category?
              </p>
              <button
                type="button"
                onClick={handleAddCategories}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <span className="text-red-500 text-xs">{error}</span>
      )}
    </div>
  );
}
