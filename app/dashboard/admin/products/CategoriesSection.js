"use client";

import React, {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { toast } from "sonner";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { createCategory, updateCategory, deleteCategory } from "./action";

const initialCreateCategoryState = {
  message: "",
  errors: {
    name: [],
    subcategories: [],
  },
  values: {},
  data: {},
};

const initialUpdateCategoryState = {
  message: "",
  errors: {
    name: [],
  },
  values: {},
  data: {},
};

const initialDeleteCategoryState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

export default function CategoriesSection({
  categories,
  categoriesLoading,
  categoriesError,
  onCategoriesRefresh,
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategories, setNewSubcategories] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [categoryUsage, setCategoryUsage] = useState({});

  const [createState, createAction, createPending] = useActionState(
    createCategory,
    initialCreateCategoryState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateCategory,
    initialUpdateCategoryState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCategory,
    initialDeleteCategoryState
  );

  const [
    createSubcategoryState,
    createSubcategoryAction,
    createSubcategoryPending,
  ] = useActionState(createCategory, initialCreateCategoryState);

  const [
    updateSubcategoryState,
    updateSubcategoryAction,
    updateSubcategoryPending,
  ] = useActionState(updateCategory, initialUpdateCategoryState);

  const [
    deleteSubcategoryState,
    deleteSubcategoryAction,
    deleteSubcategoryPending,
  ] = useActionState(deleteCategory, initialDeleteCategoryState);

  const loadCategoryUsage = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("category_id")
      .not("category_id", "is", null);

    if (error) {
      console.error("Failed to load category usage:", error);
      return;
    }

    const usage = {};
    (data || []).forEach((product) => {
      const catId = product.category_id;
      usage[catId] = (usage[catId] || 0) + 1;
    });
    setCategoryUsage(usage);
  }, []);

  useEffect(() => {
    loadCategoryUsage();
  }, [loadCategoryUsage]);

  useEffect(() => {
    const errors = createState?.errors || {};
    const hasErrors = Object.values(errors).some(
      (arr) => Array.isArray(arr) && arr.length
    );

    if (createState?.message && !hasErrors) {
      toast.success(createState.message);
      setNewCategoryName("");
      setNewSubcategories("");
      setCreateDialogOpen(false);
      onCategoriesRefresh?.();
      loadCategoryUsage();
    } else if (createState?.message && hasErrors) {
      toast.error(createState.message);
    }
  }, [createState, onCategoriesRefresh, loadCategoryUsage]);

  useEffect(() => {
    const errors = createSubcategoryState?.errors || {};
    const hasErrors = Object.values(errors).some(
      (arr) => Array.isArray(arr) && arr.length
    );

    if (createSubcategoryState?.message && !hasErrors) {
      toast.success(createSubcategoryState.message);
      setNewSubcategoryName("");
      onCategoriesRefresh?.();
      loadCategoryUsage();
    } else if (createSubcategoryState?.message && hasErrors) {
      toast.error(createSubcategoryState.message);
    }
  }, [createSubcategoryState, onCategoriesRefresh, loadCategoryUsage]);

  useEffect(() => {
    if (
      updateSubcategoryState?.message &&
      !updateSubcategoryState?.errors?.name?.length
    ) {
      toast.success(updateSubcategoryState.message);
      onCategoriesRefresh?.();
    } else if (
      updateSubcategoryState?.message &&
      updateSubcategoryState?.errors?.name?.length
    ) {
      toast.error(updateSubcategoryState.message);
    }
  }, [updateSubcategoryState, onCategoriesRefresh]);

  useEffect(() => {
    if (
      deleteSubcategoryState?.message &&
      !deleteSubcategoryState?.errors?.length
    ) {
      toast.success(deleteSubcategoryState.message);
      onCategoriesRefresh?.();
      loadCategoryUsage();
    } else if (deleteSubcategoryState?.message) {
      toast.error(deleteSubcategoryState.message);
    }
  }, [deleteSubcategoryState, onCategoriesRefresh, loadCategoryUsage]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

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
    [categoriesById]
  );

  useEffect(() => {
    if (updateState?.message && !updateState?.errors?.name?.length) {
      toast.success(updateState.message);
      setEditDialogOpen(false);
      setEditingCategory(null);
      onCategoriesRefresh?.();
    } else if (updateState?.message && updateState?.errors?.name?.length) {
      toast.error(updateState.message);
    }
  }, [updateState, onCategoriesRefresh]);

  useEffect(() => {
    if (deleteState?.message && !deleteState?.errors?.length) {
      toast.success(deleteState.message);
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      onCategoriesRefresh?.();
      loadCategoryUsage();
    } else if (deleteState?.message) {
      toast.error(deleteState.message);
    }
  }, [deleteState, onCategoriesRefresh, loadCategoryUsage]);

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name || "");
    setNewSubcategoryName("");
    setEditDialogOpen(true);
  };

  const handleDelete = (category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const subcategories = useMemo(() => {
    const parentId = editingCategory?.id;
    if (!parentId) return [];
    return (categories || [])
      .filter((cat) => cat.parent_category_id === parentId)
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [categories, editingCategory?.id]);

  return (
    <div className="mt-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[#0A0A0A] text-xs font-medium font-brasley-medium">
            Categories
          </h2>
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-full border border-primary bg-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
          >
            + New Category
          </button>
        </div>
        <p className="text-[#717182] text-[11px] font-brasley-medium">
          Manage product categories. Categories in use cannot be deleted.
        </p>
      </div>

      {categoriesLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#717182]">
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Loading categories...</span>
        </div>
      ) : categoriesError ? (
        <div className="py-6 text-[11px] text-red-600">{categoriesError}</div>
      ) : !categories.length ? (
        <div className="py-6 text-[11px] text-[#717182]">
          No categories found. Create your first category to get started.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                  Name
                </th>
                <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                  Slug
                </th>
                <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                  Usage
                </th>
                <th className="text-right py-2 px-2 font-medium text-[#0A0A0A]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const usageCount = categoryUsage[category.id] || 0;
                const canDelete = usageCount === 0;

                return (
                  <tr key={category.id} className="border-b border-[#F3F4F6]">
                    <td className="py-2 px-2 text-[#0A0A0A]">
                      {getCategoryDisplayName(category)}
                    </td>
                    <td className="py-2 px-2 text-[#6B7280]">
                      {category.slug || "-"}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                          usageCount > 0
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {usageCount} product{usageCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          className="rounded px-2 py-1 text-[11px] text-[#3979D2] hover:bg-blue-50 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={!canDelete}
                          className={`rounded px-2 py-1 text-[11px] cursor-pointer ${
                            canDelete
                              ? "text-red-600 hover:bg-red-50"
                              : "text-gray-400 cursor-not-allowed"
                          }`}
                          title={
                            canDelete
                              ? "Delete category"
                              : "Cannot delete: category is in use"
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Create Category
            </DialogTitle>
          </DialogHeader>
          <form action={createAction} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="new-category-name"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="new-category-name"
                name="name"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Gift Baskets"
                className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                disabled={createPending}
              />
              {(createState?.errors?.name || []).length ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {createState.errors.name.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="new-category-subcategories"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Subcategories
              </label>
              <textarea
                id="new-category-subcategories"
                name="subcategories"
                rows={4}
                value={newSubcategories}
                onChange={(e) => setNewSubcategories(e.target.value)}
                placeholder="Enter one per line"
                className="w-full rounded-lg border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                disabled={createPending}
              />
              {(createState?.errors?.subcategories || []).length ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {createState.errors.subcategories.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {(() => {
              const errors = createState?.errors || {};
              const hasErrors = Object.values(errors).some(
                (arr) => Array.isArray(arr) && arr.length
              );

              if (!createState?.message || !hasErrors) return null;
              return (
                <p className="text-[11px] text-red-600">
                  {createState.message}
                </p>
              );
            })()}
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
                {createPending ? "Saving..." : "Save Category"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Category
            </DialogTitle>
          </DialogHeader>
          <form id="edit-category-form" action={updateAction} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="edit-category-name"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-category-name"
                name="name"
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder="e.g. Gift Baskets"
                className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                disabled={updatePending}
              />
              {(updateState?.errors?.name || []).length ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {updateState.errors.name.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {updateState?.message && updateState?.errors?.name?.length ? (
              <p className="text-[11px] text-red-600">{updateState.message}</p>
            ) : null}
            <input
              type="hidden"
              name="categoryId"
              value={editingCategory?.id || ""}
            />
            <div className="flex items-center justify-end gap-2">
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
                {updatePending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-[#0A0A0A]">Subcategories</h3>
            </div>

            {!subcategories.length ? (
              <p className="text-[11px] text-[#717182]">No subcategories yet.</p>
            ) : (
              <div className="space-y-2">
                {subcategories.map((subcat) => (
                  <div key={subcat.id} className="flex items-center gap-2">
                    <form
                      action={updateSubcategoryAction}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input type="hidden" name="categoryId" value={subcat.id} />
                      <input
                        name="name"
                        type="text"
                        defaultValue={subcat.name || ""}
                        className="flex-1 rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={updateSubcategoryPending}
                      />
                      <button
                        type="submit"
                        disabled={updateSubcategoryPending}
                        className="rounded-full border border-[#3979D2] bg-[#3979D2] px-3 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
                      >
                        Save
                      </button>
                    </form>

                    <form action={deleteSubcategoryAction}>
                      <input type="hidden" name="categoryId" value={subcat.id} />
                      <button
                        type="submit"
                        disabled={deleteSubcategoryPending}
                        className="rounded-full border border-red-600 bg-red-600 px-3 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-red-600 cursor-pointer"
                        title="Delete subcategory"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            <form action={createSubcategoryAction} className="space-y-2">
              <input
                type="hidden"
                name="parentCategoryId"
                value={editingCategory?.id || ""}
              />
              <div className="flex items-center gap-2">
                <input
                  name="name"
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="Add subcategory"
                  className="flex-1 rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                  disabled={createSubcategoryPending}
                />
                <button
                  type="submit"
                  disabled={createSubcategoryPending}
                  className="rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
                >
                  {createSubcategoryPending ? "Adding..." : "Add"}
                </button>
              </div>

              {(() => {
                const errors = createSubcategoryState?.errors || {};
                const hasErrors = Object.values(errors).some(
                  (arr) => Array.isArray(arr) && arr.length
                );

                if (!createSubcategoryState?.message || !hasErrors) return null;
                return (
                  <p className="text-[11px] text-red-600">
                    {createSubcategoryState.message}
                  </p>
                );
              })()}
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Delete Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[11px] text-[#6B7280]">
              Are you sure you want to delete the category{" "}
              <strong>"{deletingCategory?.name}"</strong>?
              {categoryUsage[deletingCategory?.id] > 0 && (
                <span className="block mt-2 text-red-600">
                  This cannot be undone because the category is being used by{" "}
                  {categoryUsage[deletingCategory?.id]} product(s).
                </span>
              )}
            </p>
            {deleteState?.message ? (
              <p className="text-[11px] text-red-600">{deleteState.message}</p>
            ) : null}
            <form action={deleteAction} className="space-y-4">
              <input
                type="hidden"
                name="categoryId"
                value={deletingCategory?.id || ""}
              />
              <div className="flex items-center justify-end gap-2">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={deletePending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={
                    deletePending || categoryUsage[deletingCategory?.id] > 0
                  }
                  className={`rounded-full px-4 py-2 text-[11px] font-medium cursor-pointer ${
                    categoryUsage[deletingCategory?.id] > 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "border border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600"
                  }`}
                >
                  {deletePending ? "Deleting..." : "Delete Category"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
