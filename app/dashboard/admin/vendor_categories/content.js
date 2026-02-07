"use client";

import React, { useEffect, useMemo, useState, useActionState } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { Switch } from "@/app/components/Switch";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { fetchVendorCategories } from "../vendorCategories";
import { createVendorCategory, updateVendorCategory } from "./action";

const initialCreateState = {
  message: "",
  errors: { name: [], sortOrder: [] },
  values: {},
  data: {},
};

const initialUpdateState = {
  message: "",
  errors: { categoryId: [], name: [], sortOrder: [] },
  values: {},
  data: {},
};

export default function VendorCategoriesContent() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("");
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [createState, createAction, createPending] = useActionState(
    createVendorCategory,
    initialCreateState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateVendorCategory,
    initialUpdateState,
  );

  const refreshCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVendorCategories({ includeInactive: true });
      setCategories(data || []);
    } catch (err) {
      setCategories([]);
      setError(err?.message || "Unable to load vendor categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  useEffect(() => {
    if (!createState?.message) return;
    const hasErrors = Object.values(createState.errors || {}).some(
      (value) => Array.isArray(value) && value.length,
    );

    if (hasErrors) {
      toast.error(createState.message);
      return;
    }

    toast.success(createState.message || "Vendor category created.");
    setNewName("");
    setNewSortOrder("");
    setCreateOpen(false);
    refreshCategories();
  }, [createState]);

  useEffect(() => {
    if (!updateState?.message) return;
    const hasErrors = Object.values(updateState.errors || {}).some(
      (value) => Array.isArray(value) && value.length,
    );

    if (hasErrors) {
      toast.error(updateState.message);
      return;
    }

    toast.success(updateState.message || "Vendor category updated.");
    setEditOpen(false);
    setEditingCategory(null);
    refreshCategories();
  }, [updateState]);

  const sortedCategories = useMemo(() => {
    return [...(categories || [])].sort((a, b) => {
      const orderA = Number(a.sort_order ?? 0);
      const orderB = Number(b.sort_order ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [categories]);

  const openEdit = (category) => {
    setEditingCategory(category);
    setEditName(category?.name || "");
    setEditSortOrder(
      typeof category?.sort_order === "number" ? String(category.sort_order) : "",
    );
    setEditIsActive(category?.is_active !== false);
    setEditOpen(true);
  };

  return (
    <section aria-label="Vendor categories management" className="flex flex-col space-y-4 w-full mb-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Vendor Categories
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Manage vendor categories used across vendor onboarding.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-full border border-primary bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
        >
          New Category
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#717182]">
            <LoaderCircle className="size-3.5 animate-spin" />
            <span>Loading categories...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-[11px] text-red-600">{error}</div>
        ) : sortedCategories.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Name
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Sort Order
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Status
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-[#0A0A0A]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((category) => (
                  <tr key={category.id} className="border-b border-[#F3F4F6]">
                    <td className="py-2 px-2 text-[#0A0A0A]">
                      {category.name || "Untitled"}
                    </td>
                    <td className="py-2 px-2 text-[#6B7280]">
                      {typeof category.sort_order === "number"
                        ? category.sort_order
                        : "—"}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={cx(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px]",
                          category.is_active === false
                            ? "bg-gray-100 text-gray-600"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {category.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="rounded px-2 py-1 text-[11px] text-[#3979D2] hover:bg-blue-50 cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-[11px] text-[#717182]">
            No vendor categories available yet.
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Create Vendor Category
            </DialogTitle>
          </DialogHeader>
          <form action={createAction} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="vendor-category-name"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="vendor-category-name"
                name="name"
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  (createState?.errors?.name || []).length ? hasErrorInput : "",
                )}
                placeholder="e.g. Home & Living"
                disabled={createPending}
              />
              {(createState?.errors?.name || []).length ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {createState.errors.name.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="vendor-category-order"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Sort Order
              </label>
              <input
                id="vendor-category-order"
                name="sortOrder"
                type="number"
                min="0"
                value={newSortOrder}
                onChange={(event) => setNewSortOrder(event.target.value)}
                className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                placeholder="0"
                disabled={createPending}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={createPending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={createPending}
                className="rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
              >
                {createPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Vendor Category
            </DialogTitle>
          </DialogHeader>
          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="categoryId" value={editingCategory?.id || ""} />
            <input type="hidden" name="isActive" value={editIsActive ? "true" : "false"} />
            <div className="space-y-1">
              <label
                htmlFor="edit-vendor-category-name"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-vendor-category-name"
                name="name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  (updateState?.errors?.name || []).length ? hasErrorInput : "",
                )}
                placeholder="Category name"
                disabled={updatePending}
              />
              {(updateState?.errors?.name || []).length ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {updateState.errors.name.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="edit-vendor-category-order"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Sort Order
              </label>
              <input
                id="edit-vendor-category-order"
                name="sortOrder"
                type="number"
                min="0"
                value={editSortOrder}
                onChange={(event) => setEditSortOrder(event.target.value)}
                className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                placeholder="0"
                disabled={updatePending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editIsActive}
                  onCheckedChange={(checked) => setEditIsActive(!!checked)}
                  disabled={updatePending}
                />
                <span className="text-xs text-[#0A0A0A]">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={updatePending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={updatePending}
                  className="rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
                >
                  {updatePending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
