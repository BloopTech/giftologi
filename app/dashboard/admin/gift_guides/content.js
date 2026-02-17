"use client";
import React, {
  useState,
  useEffect,
  useActionState,
  useCallback,
  useRef,
} from "react";
import { useAdminGiftGuidesContext } from "./context";
import {
  createGuide,
  updateGuide,
  deleteGuide,
  addGuideItem,
  removeGuideItem,
  createOccasionLabel,
  createBudgetLabel,
  deleteOccasionLabel,
  deleteBudgetLabel,
} from "./action";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Loader2,
  X,
  GripVertical,
  ExternalLink,
  Settings,
  Tag,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../../components/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";

const initialFormState = { message: "", errors: {}, values: {}, data: {} };

// slugify removed — slug is now auto-generated server-side

// ── Create / Edit Guide Dialog ───────────────────────────────────

// ── Label Management Dialog ──────────────────────────────────────

function LabelManagementDialog({ open, onClose }) {
  const {
    occasionLabels = [],
    budgetLabels = [],
    refresh,
  } = useAdminGiftGuidesContext() ?? {};

  const [createOccState, createOccAction, createOccPending] = useActionState(
    createOccasionLabel,
    initialFormState,
  );
  const [createBudState, createBudAction, createBudPending] = useActionState(
    createBudgetLabel,
    initialFormState,
  );
  const [delOccState, delOccAction, delOccPending] = useActionState(
    deleteOccasionLabel,
    initialFormState,
  );
  const [delBudState, delBudAction, delBudPending] = useActionState(
    deleteBudgetLabel,
    initialFormState,
  );

  const [occValue, setOccValue] = useState("");
  const [occLabel, setOccLabel] = useState("");
  const [budValue, setBudValue] = useState("");
  const [budLabel, setBudLabel] = useState("");

  const createOccRef = useRef(createOccState);
  useEffect(() => {
    if (createOccState === createOccRef.current) return;
    createOccRef.current = createOccState;
    if (createOccState?.success) {
      toast.success("Occasion added");
      setOccValue("");
      setOccLabel("");
      refresh();
    } else if (createOccState?.message) toast.error(createOccState.message);
  }, [createOccState, refresh]);

  const createBudRef = useRef(createBudState);
  useEffect(() => {
    if (createBudState === createBudRef.current) return;
    createBudRef.current = createBudState;
    if (createBudState?.success) {
      toast.success("Budget range added");
      setBudValue("");
      setBudLabel("");
      refresh();
    } else if (createBudState?.message) toast.error(createBudState.message);
  }, [createBudState, refresh]);

  const delOccRef = useRef(delOccState);
  useEffect(() => {
    if (delOccState === delOccRef.current) return;
    delOccRef.current = delOccState;
    if (delOccState?.success) {
      toast.success("Occasion removed");
      refresh();
    } else if (delOccState?.message) toast.error(delOccState.message);
  }, [delOccState, refresh]);

  const delBudRef = useRef(delBudState);
  useEffect(() => {
    if (delBudState === delBudRef.current) return;
    delBudRef.current = delBudState;
    if (delBudState?.success) {
      toast.success("Budget range removed");
      refresh();
    } else if (delBudState?.message) toast.error(delBudState.message);
  }, [delBudState, refresh]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-base font-semibold text-[#111827]">
          Manage Guide Labels
        </DialogTitle>

        {/* Occasions */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#374151] mb-2">
            Occasion Labels
          </p>
          <div className="space-y-1 mb-3 max-h-[150px] overflow-y-auto">
            {occasionLabels.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 p-2 bg-[#F9FAFB] rounded-lg"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium text-[#111827]">
                    {o.label}
                  </span>
                  <span className="text-[10px] text-[#6B7280] ml-2 font-mono">
                    {o.value}
                  </span>
                </div>
                <form action={delOccAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <button
                    type="submit"
                    disabled={delOccPending}
                    className="p-1 text-[#9CA3AF] hover:text-red-500 transition cursor-pointer"
                    onClick={(e) => {
                      if (!window.confirm(`Delete "${o.label}"?`))
                        e.preventDefault();
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ))}
            {!occasionLabels.length && (
              <p className="text-[10px] text-[#9CA3AF]">No occasions yet.</p>
            )}
          </div>
          <form action={createOccAction} className="flex items-end gap-2">
            <div className="flex-1">
              <input
                type="text"
                name="value"
                value={occValue}
                onChange={(e) =>
                  setOccValue(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  )
                }
                placeholder="value (e.g. wedding)"
                className="w-full text-xs px-3 py-1.5 border border-[#D1D5DB] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                name="label"
                value={occLabel}
                onChange={(e) => setOccLabel(e.target.value)}
                placeholder="Display label"
                className="w-full text-xs px-3 py-1.5 border border-[#D1D5DB] rounded-lg outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={createOccPending || !occValue || !occLabel}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#111827] rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {createOccPending ? "..." : "Add"}
            </button>
          </form>
        </div>

        {/* Budget Ranges */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-[#374151] mb-2">
            Budget Range Labels
          </p>
          <div className="space-y-1 mb-3 max-h-[150px] overflow-y-auto">
            {budgetLabels.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 p-2 bg-[#F9FAFB] rounded-lg"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium text-[#111827]">
                    {b.label}
                  </span>
                  <span className="text-[10px] text-[#6B7280] ml-2 font-mono">
                    {b.value}
                  </span>
                </div>
                <form action={delBudAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    disabled={delBudPending}
                    className="p-1 text-[#9CA3AF] hover:text-red-500 transition cursor-pointer"
                    onClick={(e) => {
                      if (!window.confirm(`Delete "${b.label}"?`))
                        e.preventDefault();
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ))}
            {!budgetLabels.length && (
              <p className="text-[10px] text-[#9CA3AF]">
                No budget ranges yet.
              </p>
            )}
          </div>
          <form action={createBudAction} className="flex items-end gap-2">
            <div className="flex-1">
              <input
                type="text"
                name="value"
                value={budValue}
                onChange={(e) =>
                  setBudValue(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  )
                }
                placeholder="value (e.g. under_50)"
                className="w-full text-xs px-3 py-1.5 border border-[#D1D5DB] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                name="label"
                value={budLabel}
                onChange={(e) => setBudLabel(e.target.value)}
                placeholder="Display label"
                className="w-full text-xs px-3 py-1.5 border border-[#D1D5DB] rounded-lg outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={createBudPending || !budValue || !budLabel}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#111827] rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {createBudPending ? "..." : "Add"}
            </button>
          </form>
        </div>

        <DialogClose className="absolute right-4 top-4 text-[#6B7280] hover:text-[#111827]">
          <X className="w-5 h-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

// ── Unassigned Products Panel ────────────────────────────────────

function UnassignedProductsPanel() {
  const ctx = useAdminGiftGuidesContext();

  const showUnassigned = ctx?.showUnassigned;
  const setShowUnassigned = ctx?.setShowUnassigned;
  const allGuides = ctx?.allGuides ?? [];
  const products = ctx?.unassignedProducts ?? [];
  const totalCount = ctx?.unassignedTotalCount ?? 0;
  const page = ctx?.unassignedPage ?? 1;
  const setPage = ctx?.setUnassignedPage ?? (() => {});
  const search = ctx?.unassignedSearch ?? "";
  const setSearch = ctx?.setUnassignedSearch ?? (() => {});
  const loading = ctx?.unassignedLoading;
  const fetchUnassigned = ctx?.fetchUnassignedProducts ?? (() => {});
  const pageSize = ctx?.unassignedPageSize ?? 20;

  const [selectedGuideId, setSelectedGuideId] = useState("");

  const [addState, addAction, addPending] = useActionState(
    addGuideItem,
    initialFormState,
  );
  const addHandledRef = useRef(addState);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (addState === addHandledRef.current) return;
    addHandledRef.current = addState;
    if (addState?.success) {
      toast.success("Product added to guide");
      fetchUnassigned?.(page, search);
    } else if (addState?.message) {
      toast.error(addState.message);
    }
  }, [addState, fetchUnassigned, page, search]);

  if (!showUnassigned) return null;

  return (
    <Dialog
      open={showUnassigned}
      onOpenChange={(o) => !o && setShowUnassigned(false)}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-base font-semibold text-[#111827]">
          Unassigned Products {totalCount > 0 && `(${totalCount})`}
        </DialogTitle>
        <p className="text-xs text-[#6B7280] mt-1">
          Products not assigned to any gift guide.
        </p>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unassigned products..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#D1D5DB] rounded-lg outline-none focus:border-[#A5914B] transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-xs text-[#9CA3AF] text-center py-8">
            {search
              ? "No matching unassigned products."
              : "All products are assigned to guides."}
          </p>
        ) : (
          <div className="space-y-2 mt-3 max-h-[350px] overflow-y-auto">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 p-2 bg-white border border-[#E5E7EB] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111827] truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-[#6B7280]">
                    {p.vendor?.business_name || "—"} · GHS{" "}
                    {Number(p.price).toFixed(2)}
                  </p>
                </div>
                <form action={addAction} className="flex items-center gap-1">
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="guideId" value={selectedGuideId} />
                  <Select
                    value={selectedGuideId || ""}
                    onValueChange={(value) => setSelectedGuideId(value)}
                  >
                    <SelectTrigger className="h-7 max-w-[140px] rounded px-2 py-1 text-[10px]">
                      <SelectValue placeholder="Select guide" />
                    </SelectTrigger>
                    <SelectContent>
                      {allGuides.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="submit"
                    disabled={addPending || !selectedGuideId}
                    className="px-2 py-1 text-[10px] font-medium text-white bg-[#111827] rounded hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                  >
                    {addPending ? "..." : "Assign"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-2 py-1 text-[10px] font-medium border border-[#D1D5DB] rounded hover:bg-[#F9FAFB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pg;
              if (totalPages <= 7) {
                pg = i + 1;
              } else if (page <= 4) {
                pg = i + 1;
              } else if (page >= totalPages - 3) {
                pg = totalPages - 6 + i;
              } else {
                pg = page - 3 + i;
              }
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 text-[10px] font-medium rounded cursor-pointer ${
                    pg === page
                      ? "bg-[#111827] text-white"
                      : "border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151]"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-2 py-1 text-[10px] font-medium border border-[#D1D5DB] rounded hover:bg-[#F9FAFB] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        <DialogClose className="absolute right-4 top-4 text-[#6B7280] hover:text-[#111827]">
          <X className="w-5 h-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function GuideFormDialog({ open, onClose, guide, onSuccess }) {
  const { occasionLabels = [], budgetLabels = [] } =
    useAdminGiftGuidesContext() ?? {};
  const isEdit = !!guide;
  const [createState, createAction, createPending] = useActionState(
    createGuide,
    initialFormState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateGuide,
    initialFormState,
  );

  const state = isEdit ? updateState : createState;
  const pending = isEdit ? updatePending : createPending;

  const [title, setTitle] = useState(guide?.title || "");
  const [description, setDescription] = useState(guide?.description || "");
  const [coverPreview, setCoverPreview] = useState(guide?.cover_image || "");
  const [occasion, setOccasion] = useState(guide?.occasion || "");
  const [budgetRange, setBudgetRange] = useState(guide?.budget_range || "");
  const [isPublished, setIsPublished] = useState(guide?.is_published ?? false);

  useEffect(() => {
    if (guide) {
      setTitle(guide.title || "");
      setDescription(guide.description || "");
      setCoverPreview(guide.cover_image || "");
      setOccasion(guide.occasion || "");
      setBudgetRange(guide.budget_range || "");
      setIsPublished(guide.is_published ?? false);
    } else {
      setTitle("");
      setDescription("");
      setCoverPreview("");
      setOccasion("");
      setBudgetRange("");
      setIsPublished(false);
    }
  }, [guide, open]);

  useEffect(() => {
    if (!state?.success && !state?.message) return;
    if (state.success) {
      toast.success(isEdit ? "Guide updated" : "Guide created");
      onSuccess?.();
      onClose?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-base font-semibold text-[#111827]">
          {isEdit ? "Edit Guide" : "New Gift Guide"}
        </DialogTitle>

        <form
          action={isEdit ? updateAction : createAction}
          className="space-y-4 mt-4"
        >
          {isEdit && <input type="hidden" name="guideId" value={guide.id} />}

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm outline-none focus:border-[#A5914B] transition"
            />
            {state?.errors?.title && (
              <p className="text-[10px] text-red-500 mt-0.5">
                {state.errors.title}
              </p>
            )}
          </div>

          {isEdit && guide?.slug && (
            <p className="text-[10px] text-[#6B7280]">
              Slug: <span className="font-mono">{guide.slug}</span>
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm outline-none focus:border-[#A5914B] transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Cover Image
            </label>
            {coverPreview && (
              <div className="mb-2 relative w-full h-32 rounded-lg overflow-hidden bg-[#F3F4F6]">
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <input
              type="file"
              name="coverImageFile"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCoverPreview(URL.createObjectURL(f));
              }}
              className="w-full text-xs text-[#374151] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#F3F4F6] file:text-[#374151] file:cursor-pointer"
            />
            {isEdit && (
              <p className="text-[10px] text-[#9CA3AF] mt-1">
                Leave empty to keep current image
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Occasion
              </label>
              <input type="hidden" name="occasion" value={occasion} />
              <Select
                value={occasion || undefined}
                onValueChange={(v) => setOccasion(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(occasionLabels || []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Budget Range
              </label>
              <input type="hidden" name="budgetRange" value={budgetRange} />
              <Select
                value={budgetRange || undefined}
                onValueChange={(v) => setBudgetRange(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(budgetLabels || []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isPublished"
              value="true"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-[#D1D5DB] text-[#A5914B] focus:ring-[#A5914B]"
            />
            <span className="text-xs text-[#374151]">Published</span>
          </label>
          {/* hidden fallback for unchecked */}
          {!isPublished && (
            <input type="hidden" name="isPublished" value="false" />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 text-xs font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] disabled:opacity-50 transition cursor-pointer"
            >
              {pending ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>

        <DialogClose className="absolute right-4 top-4 text-[#6B7280] hover:text-[#111827]">
          <X className="w-5 h-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

// ── Guide Items Panel ────────────────────────────────────────────

function GuideItemsPanel() {
  const {
    selectedGuide,
    setSelectedGuide,
    guideItems = [],
    loadingItems,
    fetchGuideItems,
    productSearch,
    setProductSearch,
    productResults = [],
    searchingProducts,
    searchProducts,
  } = useAdminGiftGuidesContext() ?? {};

  const [addState, addAction, addPending] = useActionState(
    addGuideItem,
    initialFormState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeGuideItem,
    initialFormState,
  );

  const addHandledRef = useRef(addState);
  useEffect(() => {
    if (addState === addHandledRef.current) return;
    addHandledRef.current = addState;
    if (addState?.success) {
      toast.success("Product added");
      setProductSearch("");
      if (selectedGuide?.id) fetchGuideItems(selectedGuide.id);
    } else if (addState?.message) {
      toast.error(addState.message);
    }
  }, [addState, fetchGuideItems, selectedGuide?.id, setProductSearch]);

  const removeHandledRef = useRef(removeState);
  useEffect(() => {
    if (removeState === removeHandledRef.current) return;
    removeHandledRef.current = removeState;
    if (removeState?.success) {
      toast.success("Product removed");
      if (selectedGuide?.id) fetchGuideItems(selectedGuide.id);
    } else if (removeState?.message) {
      toast.error(removeState.message);
    }
  }, [removeState, fetchGuideItems, selectedGuide?.id]);

  // Debounced product search
  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch, searchProducts]);

  if (!selectedGuide) return null;

  return (
    <Dialog
      open={!!selectedGuide}
      onOpenChange={(open) => {
        if (!open) setSelectedGuide(null);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-base font-semibold text-[#111827]">
          {selectedGuide.title} — Products
        </DialogTitle>

        {/* Current items */}
        <div className="mt-4">
          <p className="text-xs font-medium text-[#6B7280] mb-2">
            {guideItems.length} product{guideItems.length !== 1 ? "s" : ""} in
            guide
          </p>

          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
            </div>
          ) : guideItems.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] text-center py-6">
              No products yet. Search and add below.
            </p>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {guideItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 bg-[#F9FAFB] rounded-lg"
                >
                  <GripVertical className="w-4 h-4 text-[#D1D5DB] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#111827] truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-[#6B7280]">
                      {item.product.vendor?.business_name || "—"} · GHS{" "}
                      {Number(item.product.price).toFixed(2)}
                    </p>
                    {item.editor_note && (
                      <p className="text-[10px] text-[#A5914B] italic">
                        {item.editor_note}
                      </p>
                    )}
                  </div>
                  <form action={removeAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button
                      type="submit"
                      disabled={removePending}
                      className="p-1 text-[#9CA3AF] hover:text-red-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add product */}
        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
          <p className="text-xs font-medium text-[#374151] mb-2">Add Product</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products by name..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#D1D5DB] rounded-lg outline-none focus:border-[#A5914B] transition"
            />
          </div>

          {searchingProducts && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#9CA3AF]" />
            </div>
          )}

          {productResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
              {productResults.map((p) => {
                const alreadyAdded = guideItems.some(
                  (gi) => gi.product.id === p.id,
                );
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white border border-[#E5E7EB] rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111827] truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-[#6B7280]">
                        {p.vendor?.business_name || "—"} · GHS{" "}
                        {Number(p.price).toFixed(2)}
                      </p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-[10px] text-[#9CA3AF]">Added</span>
                    ) : (
                      <form action={addAction}>
                        <input
                          type="hidden"
                          name="guideId"
                          value={selectedGuide.id}
                        />
                        <input type="hidden" name="productId" value={p.id} />
                        <button
                          type="submit"
                          disabled={addPending}
                          className="px-2 py-1 text-[10px] font-medium text-white bg-[#111827] rounded hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                        >
                          {addPending ? "..." : "+ Add"}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogClose className="absolute right-4 top-4 text-[#6B7280] hover:text-[#111827]">
          <X className="w-5 h-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Content ─────────────────────────────────────────────────

export default function AdminGiftGuidesContent() {
  const {
    guides = [],
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refresh,
    setSelectedGuide,
    occasionLabels = [],
    setShowUnassigned,
  } = useAdminGiftGuidesContext() ?? {};

  const [labelsOpen, setLabelsOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editGuide, setEditGuide] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteGuide,
    initialFormState,
  );

  const deleteHandledRef = useRef(deleteState);
  useEffect(() => {
    if (deleteState === deleteHandledRef.current) return;
    deleteHandledRef.current = deleteState;
    if (deleteState?.success) {
      toast.success("Guide deleted");
      refresh();
    } else if (deleteState?.message) {
      toast.error(deleteState.message);
    }
  }, [deleteState, refresh]);

  const formatDate = (v) => {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Gift Guides</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Create and manage curated gift collections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUnassigned(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Unassigned
          </button>
          <button
            type="button"
            onClick={() => setLabelsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            Labels
          </button>
          <button
            type="button"
            onClick={() => {
              setEditGuide(null);
              setFormKey((k) => k + 1);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Guide
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search guides..."
          className="w-full pl-9 pr-3 py-2 text-xs border border-[#D1D5DB] rounded-lg outline-none focus:border-[#A5914B] transition"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 text-xs text-[#A5914B] hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" />
          <p className="text-sm text-[#6B7280]">No gift guides yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Title
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">Slug</th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Occasion
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Created
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {guides.map((guide) => (
                  <tr
                    key={guide.id}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#111827] max-w-[200px] truncate">
                      {guide.title}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono">
                      {guide.slug}
                    </td>
                    <td className="px-4 py-3 text-[#374151]">
                      {occasionLabels.find((o) => o.value === guide.occasion)
                        ?.label ||
                        guide.occasion ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {guide.is_published ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <Eye className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                          <EyeOff className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                      {formatDate(guide.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedGuide(guide)}
                          className="p-1.5 text-[#6B7280] hover:text-[#111827] transition cursor-pointer"
                          title="Manage products"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditGuide(guide);
                            setFormKey((k) => k + 1);
                            setFormOpen(true);
                          }}
                          className="p-1.5 text-[#6B7280] hover:text-[#111827] transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <form action={deleteAction}>
                          <input
                            type="hidden"
                            name="guideId"
                            value={guide.id}
                          />
                          <button
                            type="submit"
                            disabled={deletePending}
                            className="p-1.5 text-[#9CA3AF] hover:text-red-500 transition cursor-pointer"
                            title="Delete"
                            onClick={(e) => {
                              if (
                                !window.confirm(
                                  `Delete "${guide.title}"? This cannot be undone.`,
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                        {guide.is_published && (
                          <a
                            href={`/gift-guides/${guide.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#6B7280] hover:text-[#A5914B] transition"
                            title="View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <GuideFormDialog
        key={formKey}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditGuide(null);
        }}
        guide={editGuide}
        onSuccess={refresh}
      />
      <GuideItemsPanel />
      <LabelManagementDialog
        open={labelsOpen}
        onClose={() => setLabelsOpen(false)}
      />
      <UnassignedProductsPanel />
    </div>
  );
}
