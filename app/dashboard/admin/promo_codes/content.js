"use client";

import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useActionState,
} from "react";
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
import CascadingCategoryPicker from "@/app/components/CascadingCategoryPicker";
import { usePromoCodes } from "./context";
import { createPromoCode, updatePromoCode } from "./action";

const initialCreateState = {
  message: "",
  errors: {
    code: [],
    description: [],
    percentOff: [],
    minSpend: [],
    usageLimit: [],
    perUserLimit: [],
    startAt: [],
    endAt: [],
  },
  values: {},
  data: {},
};

const initialUpdateState = {
  message: "",
  errors: {
    promoId: [],
    code: [],
    description: [],
    percentOff: [],
    minSpend: [],
    usageLimit: [],
    perUserLimit: [],
    startAt: [],
    endAt: [],
  },
  values: {},
  data: {},
};

const toErrorList = (err) => {
  if (!err) return [];
  if (Array.isArray(err)) return err.filter(Boolean);
  const str = String(err).trim();
  return str ? [str] : [];
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS 0.00";
  return `GHS ${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (
    date.toLocaleString("en-GH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " GMT"
  );
};

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Format as YYYY-MM-DDThh:mm in UTC for datetime-local input
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

const getNowUTCString = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

const SHIPPABLE_OPTIONS = [
  { value: "any", label: "Any product" },
  { value: "shippable", label: "Shippable only" },
  { value: "non_shippable", label: "Non-shippable only" },
];

const PRODUCT_TYPE_OPTIONS = [
  { value: "any", label: "Any type" },
  { value: "physical", label: "Physical only" },
  { value: "treat", label: "Treat only" },
];

const getPromoStatus = (promo) => {
  if (!promo?.active) {
    return { label: "Inactive", className: "bg-gray-100 text-gray-600" };
  }
  const now = new Date();
  const startAt = promo?.start_at ? new Date(promo.start_at) : null;
  const endAt = promo?.end_at ? new Date(promo.end_at) : null;
  if (startAt && now < startAt) {
    return { label: "Scheduled", className: "bg-blue-100 text-blue-700" };
  }
  if (endAt && now > endAt) {
    return { label: "Expired", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "Active", className: "bg-emerald-100 text-emerald-700" };
};

const sortByName = (list) =>
  (list || []).slice().sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || "")),
  );

const promoStepLabels = ["Details", "Limits", "Filters", "Categories", "Targets"];

export default function PromoCodesContent() {
  const {
    promos,
    targetMap,
    categories,
    loading,
    error,
    refreshPromos,
    selectedProductsCache,
    setSelectedProductsCache,
  } = usePromoCodes();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPercentOff, setNewPercentOff] = useState("");
  const [newMinSpend, setNewMinSpend] = useState("");
  const [newUsageLimit, setNewUsageLimit] = useState("");
  const [newPerUserLimit, setNewPerUserLimit] = useState("1");
  const [newStartAt, setNewStartAt] = useState("");
  const [newEndAt, setNewEndAt] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newTargetProductIds, setNewTargetProductIds] = useState([]);
  const [newTargetCategoryIds, setNewTargetCategoryIds] = useState([]);
  const [newTargetShippable, setNewTargetShippable] = useState("any");
  const [newTargetProductType, setNewTargetProductType] = useState("any");

  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPercentOff, setEditPercentOff] = useState("");
  const [editMinSpend, setEditMinSpend] = useState("");
  const [editUsageLimit, setEditUsageLimit] = useState("");
  const [editPerUserLimit, setEditPerUserLimit] = useState("1");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editTargetProductIds, setEditTargetProductIds] = useState([]);
  const [editTargetCategoryIds, setEditTargetCategoryIds] = useState([]);
  const [editTargetShippable, setEditTargetShippable] = useState("any");
  const [editTargetProductType, setEditTargetProductType] = useState("any");

  const [createStep, setCreateStep] = useState(0);
  const [editStep, setEditStep] = useState(0);

  // Debounced product search state
  const [createProductSearch, setCreateProductSearch] = useState("");
  const [editProductSearch, setEditProductSearch] = useState("");
  const [createSearchResults, setCreateSearchResults] = useState([]);
  const [editSearchResults, setEditSearchResults] = useState([]);
  const [createSearchLoading, setCreateSearchLoading] = useState(false);
  const [editSearchLoading, setEditSearchLoading] = useState(false);
  const createSearchTimer = useRef(null);
  const editSearchTimer = useRef(null);

  const searchProductsFor = useCallback(async (query, setResults, setLoading, { productType, shippable, categoryIds } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if ((query || "").trim()) params.set("q", query.trim());
      if (productType && productType !== "any") params.set("product_type", productType);
      if (shippable && shippable !== "any") params.set("is_shippable", shippable);
      if (Array.isArray(categoryIds) && categoryIds.length > 0) params.set("category_ids", categoryIds.join(","));
      const res = await fetch(`/api/dashboard/product-search?${params}`);
      if (!res.ok) { setResults([]); return; }
      const body = await res.json();
      const products = Array.isArray(body.products) ? body.products : [];
      setResults(products);
      setSelectedProductsCache((prev) => {
        const next = new Map(prev);
        products.forEach((p) => next.set(p.id, p));
        return next;
      });
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [setSelectedProductsCache]);

  const handleCreateProductSearch = useCallback((value) => {
    setCreateProductSearch(value);
    if (createSearchTimer.current) clearTimeout(createSearchTimer.current);
    createSearchTimer.current = setTimeout(() => {
      searchProductsFor(value, setCreateSearchResults, setCreateSearchLoading, {
        productType: newTargetProductType,
        shippable: newTargetShippable,
        categoryIds: newTargetCategoryIds,
      });
    }, 350);
  }, [searchProductsFor, newTargetProductType, newTargetShippable, newTargetCategoryIds]);

  const handleEditProductSearch = useCallback((value) => {
    setEditProductSearch(value);
    if (editSearchTimer.current) clearTimeout(editSearchTimer.current);
    editSearchTimer.current = setTimeout(() => {
      searchProductsFor(value, setEditSearchResults, setEditSearchLoading, {
        productType: editTargetProductType,
        shippable: editTargetShippable,
        categoryIds: editTargetCategoryIds,
      });
    }, 350);
  }, [searchProductsFor, editTargetProductType, editTargetShippable, editTargetCategoryIds]);

  useEffect(() => {
    if (createOpen) searchProductsFor("", setCreateSearchResults, setCreateSearchLoading, {
      productType: newTargetProductType,
      shippable: newTargetShippable,
      categoryIds: newTargetCategoryIds,
    });
  }, [createOpen, searchProductsFor, newTargetProductType, newTargetShippable, newTargetCategoryIds]);

  useEffect(() => {
    if (editOpen) searchProductsFor("", setEditSearchResults, setEditSearchLoading, {
      productType: editTargetProductType,
      shippable: editTargetShippable,
      categoryIds: editTargetCategoryIds,
    });
  }, [editOpen, searchProductsFor, editTargetProductType, editTargetShippable, editTargetCategoryIds]);

  const [createState, createAction, createPending] = useActionState(
    createPromoCode,
    initialCreateState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updatePromoCode,
    initialUpdateState,
  );

  const createFormRef = useRef(null);
  const editFormRef = useRef(null);

  const handleCreateSubmit = (event) => {
    event.preventDefault();
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
  };

  const handleCreateSave = () => {
    if (!createFormRef.current || createPending) return;
    const formData = new FormData(createFormRef.current);
    startTransition(() => {
      createAction(formData);
    });
  };

  const handleEditSave = () => {
    if (!editFormRef.current || updatePending) return;
    const formData = new FormData(editFormRef.current);
    startTransition(() => {
      updateAction(formData);
    });
  };

  useEffect(() => {
    if (!createState?.message) return;
    const hasErrors = Object.values(createState.errors || {}).some((value) =>
      Array.isArray(value) ? value.length : Boolean(value),
    );

    if (hasErrors) {
      toast.error(createState.message);
      return;
    }

    toast.success(createState.message || "Promo code created.");
    setNewCode("");
    setNewDescription("");
    setNewPercentOff("");
    setNewMinSpend("");
    setNewUsageLimit("");
    setNewPerUserLimit("1");
    setNewStartAt("");
    setNewEndAt("");
    setNewActive(true);
    setNewTargetProductIds([]);
    setNewTargetCategoryIds([]);
    setNewTargetShippable("any");
    setNewTargetProductType("any");
    setCreateProductSearch("");
    setCreateStep(0);
    setCreateOpen(false);
    refreshPromos();
  }, [createState]);

  useEffect(() => {
    if (!updateState?.message) return;
    const hasErrors = Object.values(updateState.errors || {}).some((value) =>
      Array.isArray(value) ? value.length : Boolean(value),
    );

    if (hasErrors) {
      toast.error(updateState.message);
      return;
    }

    toast.success(updateState.message || "Promo code updated.");
    setEditOpen(false);
    setEditingPromo(null);
    setEditProductSearch("");
    setEditStep(0);
    refreshPromos();
  }, [updateState]);

  // Build display list: selected products (from cache) first, then search results
  const buildProductDisplayList = useCallback((searchResults, selectedIds) => {
    const seen = new Set();
    const list = [];
    selectedIds.forEach((id) => {
      const product = selectedProductsCache.get(id);
      if (product && !seen.has(id)) { list.push(product); seen.add(id); }
    });
    (searchResults || []).forEach((product) => {
      if (!seen.has(product.id)) { list.push(product); seen.add(product.id); }
    });
    return list;
  }, [selectedProductsCache]);

  const createProductList = useMemo(
    () => buildProductDisplayList(createSearchResults, newTargetProductIds),
    [buildProductDisplayList, createSearchResults, newTargetProductIds],
  );

  const editProductList = useMemo(
    () => buildProductDisplayList(editSearchResults, editTargetProductIds),
    [buildProductDisplayList, editSearchResults, editTargetProductIds],
  );

  const newProductSet = useMemo(
    () => new Set(newTargetProductIds),
    [newTargetProductIds],
  );
  const editProductSet = useMemo(
    () => new Set(editTargetProductIds),
    [editTargetProductIds],
  );

  const toggleNewProduct = (id) => {
    if (!id) return;
    setNewTargetProductIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const toggleNewCategory = (id) => {
    if (!id) return;
    setNewTargetCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const toggleEditProduct = (id) => {
    if (!id) return;
    setEditTargetProductIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const toggleEditCategory = (id) => {
    if (!id) return;
    setEditTargetCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const openEdit = (promo) => {
    const targets = targetMap.get(promo.id);
    setEditingPromo(promo);
    setEditStep(0);
    setEditCode(promo.code || "");
    setEditDescription(promo.description || "");
    setEditPercentOff(
      promo.percent_off === null || typeof promo.percent_off === "undefined"
        ? ""
        : String(promo.percent_off),
    );
    setEditMinSpend(
      promo.min_spend === null || typeof promo.min_spend === "undefined"
        ? ""
        : String(promo.min_spend),
    );
    setEditUsageLimit(
      promo.usage_limit === null || typeof promo.usage_limit === "undefined"
        ? ""
        : String(promo.usage_limit),
    );
    setEditPerUserLimit(
      promo.per_user_limit === null || typeof promo.per_user_limit === "undefined"
        ? "1"
        : String(promo.per_user_limit),
    );
    setEditStartAt(toInputDate(promo.start_at));
    setEditEndAt(toInputDate(promo.end_at));
    setEditActive(promo.active !== false);
    setEditTargetShippable(promo.target_shippable || "any");
    setEditTargetProductType(promo.target_product_type || "any");
    setEditTargetProductIds(
      targets ? Array.from(targets.productIds || []) : [],
    );
    setEditTargetCategoryIds(
      targets ? Array.from(targets.categoryIds || []) : [],
    );
    setEditOpen(true);
  };

  const renderTargetSummary = (promoId) => {
    const targets = targetMap.get(promoId);
    if (!targets || (!targets.productIds.size && !targets.categoryIds.size)) {
      return "All products";
    }
    const productCount = targets.productIds.size;
    const categoryCount = targets.categoryIds.size;
    const summary = [];
    if (productCount) summary.push(`${productCount} product${productCount > 1 ? "s" : ""}`);
    if (categoryCount) summary.push(`${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}`);
    return summary.join(" • ");
  };

  const renderShippableLabel = (val) => {
    const opt = SHIPPABLE_OPTIONS.find((o) => o.value === val);
    return opt ? opt.label : "Any";
  };

  const renderProductTypeLabel = (val) => {
    const opt = PRODUCT_TYPE_OPTIONS.find((o) => o.value === val);
    return opt ? opt.label : "Any";
  };

  return (
    <section
      aria-label="Promo codes management"
      className="flex flex-col space-y-4 w-full mb-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Promo Codes
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Configure platform-wide discounts and targeted campaigns.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-full border border-primary bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
        >
          New Promo Code
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[11px] text-[#4B5563]">
          Platform promo codes apply across all vendors unless you target specific
          products or categories. These discounts are covered by Giftologi, so
          vendor payouts remain unchanged.
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#717182]">
            <LoaderCircle className="size-3.5 animate-spin" />
            <span>Loading promo codes...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-[11px] text-red-600">{error}</div>
        ) : promos.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Code
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Discount
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Targets
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Filters
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Usage
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-[#0A0A0A]">
                    Schedule
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
                {promos.map((promo) => {
                  const status = getPromoStatus(promo);
                  return (
                    <tr key={promo.id} className="border-b border-[#F3F4F6]">
                      <td className="py-2 px-2 text-[#0A0A0A]">
                        <div className="flex flex-col">
                          <span className="font-medium">{promo.code}</span>
                          {promo.description ? (
                            <span className="text-[11px] text-[#6B7280]">
                              {promo.description}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[#0A0A0A]">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {promo.percent_off}% off
                          </span>
                          <span className="text-[11px] text-[#6B7280]">
                            Min spend {formatCurrency(promo.min_spend)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[#6B7280]">
                        {renderTargetSummary(promo.id)}
                      </td>
                      <td className="py-2 px-2 text-[#6B7280]">
                        <div className="flex flex-col text-[11px]">
                          <span>{renderShippableLabel(promo.target_shippable)}</span>
                          <span>{renderProductTypeLabel(promo.target_product_type)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[#6B7280]">
                        <div className="flex flex-col">
                          <span>
                            {promo.usage_count || 0}
                            {typeof promo.usage_limit === "number"
                              ? ` / ${promo.usage_limit}`
                              : ""}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF]">
                            Per user: {promo.per_user_limit || 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[#6B7280]">
                        <div className="flex flex-col">
                          <span>Start {formatDate(promo.start_at)}</span>
                          <span>End {formatDate(promo.end_at)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={cx(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px]",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(promo)}
                          className="rounded px-2 py-1 text-[11px] text-[#3979D2] hover:bg-blue-50 cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-[11px] text-[#717182]">
            No promo codes created yet.
          </div>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateStep(0);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Create Promo Code
            </DialogTitle>
          </DialogHeader>
          <form
            ref={createFormRef}
            onSubmit={handleCreateSubmit}
            className="space-y-4"
          >
            <input type="hidden" name="active" value={newActive ? "true" : "false"} />
            <input type="hidden" name="targetProductIds" value={JSON.stringify(newTargetProductIds || [])} />
            <input type="hidden" name="targetCategoryIds" value={JSON.stringify(newTargetCategoryIds || [])} />
            <input type="hidden" name="targetShippable" value={newTargetShippable} />
            <input type="hidden" name="targetProductType" value={newTargetProductType} />
            <div className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 flex flex-wrap gap-2">
              {promoStepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCreateStep(index)}
                  disabled={createPending}
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                    createStep === index
                      ? "bg-primary text-white"
                      : "bg-white text-[#6B7280] border border-transparent hover:border-primary/40",
                  )}
                >
                  {`${index + 1}. ${label}`}
                </button>
              ))}
            </div>

            <div className={cx("space-y-4", createStep === 0 ? "" : "hidden")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Promo Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="code"
                    type="text"
                    value={newCode}
                    onChange={(event) => setNewCode(event.target.value)}
                    className={cx(
                      "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                      "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                      focusInput,
                      toErrorList(createState?.errors?.code).length
                        ? hasErrorInput
                        : "",
                    )}
                    placeholder="e.g. SAVE20"
                    disabled={createPending}
                  />
                  {toErrorList(createState?.errors?.code).length ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {toErrorList(createState.errors.code).map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Percent Off <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="percentOff"
                    type="number"
                    min="1"
                    max="100"
                    value={newPercentOff}
                    onChange={(event) => setNewPercentOff(event.target.value)}
                    className={cx(
                      "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                      "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                      focusInput,
                      toErrorList(createState?.errors?.percentOff).length
                        ? hasErrorInput
                        : "",
                    )}
                    placeholder="20"
                    disabled={createPending}
                  />
                  {toErrorList(createState?.errors?.percentOff).length ? (
                    <span className="text-[11px] text-red-600">
                      {toErrorList(createState.errors.percentOff)[0]}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  className="w-full rounded-xl border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                  placeholder="Short campaign note"
                  rows={2}
                  disabled={createPending}
                />
              </div>
            </div>

            <div className={cx("space-y-4", createStep === 1 ? "" : "hidden")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Minimum Spend
                  </label>
                  <input
                    name="minSpend"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMinSpend}
                    onChange={(event) => setNewMinSpend(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2.5 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    placeholder="0.00"
                    disabled={createPending}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Usage Limit
                  </label>
                  <input
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={newUsageLimit}
                    onChange={(event) => setNewUsageLimit(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2.5 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    placeholder="Leave blank for unlimited"
                    disabled={createPending}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Per User Limit
                  </label>
                  <input
                    name="perUserLimit"
                    type="number"
                    min="1"
                    value={newPerUserLimit}
                    onChange={(event) => setNewPerUserLimit(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2.5 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    placeholder="1"
                    disabled={createPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Start Date & Time <span className="text-[11px] font-normal text-[#6B7280]">(GMT)</span>
                  </label>
                  <input
                    name="startAt"
                    type="datetime-local"
                    min={getNowUTCString()}
                    value={newStartAt}
                    onChange={(event) => setNewStartAt(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={createPending}
                  />
                  {toErrorList(createState?.errors?.startAt).length ? (
                    <span className="text-[11px] text-red-600">
                      {toErrorList(createState.errors.startAt)[0]}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    End Date & Time <span className="text-[11px] font-normal text-[#6B7280]">(GMT)</span>
                  </label>
                  <input
                    name="endAt"
                    type="datetime-local"
                    min={newStartAt || getNowUTCString()}
                    value={newEndAt}
                    onChange={(event) => setNewEndAt(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={createPending}
                  />
                  {toErrorList(createState?.errors?.endAt).length ? (
                    <span className="text-[11px] text-red-600">
                      {toErrorList(createState.errors.endAt)[0]}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={newActive}
                  onCheckedChange={(checked) => setNewActive(!!checked)}
                  disabled={createPending}
                />
                <span className="text-xs text-[#0A0A0A]">Active</span>
              </div>
            </div>

            {/* Step 2: Filters */}
            <div className={cx("space-y-4", createStep === 2 ? "" : "hidden")}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#0A0A0A]">Shippability Filter</label>
                  <p className="text-[11px] text-[#6B7280]">
                    Restrict this promo code to products based on whether they require shipping.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SHIPPABLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewTargetShippable(opt.value)}
                        disabled={createPending}
                        className={cx(
                          "cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors",
                          newTargetShippable === opt.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-[#6B7280] border-[#D1D5DB] hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#0A0A0A]">Product Type Filter</label>
                  <p className="text-[11px] text-[#6B7280]">
                    Restrict this promo code to a specific product type.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewTargetProductType(opt.value)}
                        disabled={createPending}
                        className={cx(
                          "cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors",
                          newTargetProductType === opt.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-[#6B7280] border-[#D1D5DB] hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Categories */}
            <div className={cx("space-y-4", createStep === 3 ? "" : "hidden")}>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-medium text-[#0A0A0A]">
                    Target Categories (optional)
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">
                    Leave empty to apply to all categories.
                  </p>
                </div>
                <CascadingCategoryPicker
                  categories={categories}
                  selectedCategoryIds={newTargetCategoryIds}
                  onToggleCategory={toggleNewCategory}
                  onClearAll={() => setNewTargetCategoryIds([])}
                  disabled={createPending}
                />
              </div>
            </div>

            {/* Step 4: Targets */}
            <div className={cx("space-y-4", createStep === 4 ? "" : "hidden")}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-[#0A0A0A]">
                      Target Products (optional)
                    </h3>
                    <p className="text-[11px] text-[#6B7280]">
                      Leave empty to apply to all products.
                    </p>
                  </div>
                  {newTargetProductIds.length ? (
                    <button
                      type="button"
                      onClick={() => setNewTargetProductIds([])}
                      className="text-[11px] text-[#6A7282] hover:text-[#0A0A0A]"
                    >
                      Clear ({newTargetProductIds.length})
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={createProductSearch}
                  onChange={(e) => handleCreateProductSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                  disabled={createPending}
                />
                <div className="max-h-56 overflow-y-auto rounded-lg border border-[#D1D5DB] bg-white p-3 space-y-2">
                  {createSearchLoading ? (
                    <div className="flex items-center gap-2 py-2 text-[11px] text-[#717182]">
                      <LoaderCircle className="size-3 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : createProductList.length ? (
                    createProductList.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 text-[11px] text-[#111827]"
                      >
                        <input
                          type="checkbox"
                          checked={newProductSet.has(product.id)}
                          onChange={() => toggleNewProduct(product.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        />
                        <span className="font-medium">
                          {product.name || "Untitled"}
                        </span>
                        {product.vendor?.business_name ? (
                          <span className="text-[#6B7280]">
                            • {product.vendor.business_name}
                          </span>
                        ) : null}
                      </label>
                    ))
                  ) : (
                    <p className="text-[11px] text-[#9CA3AF]">
                      No products found.
                    </p>
                  )}
                </div>
              </div>
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
              {createStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setCreateStep((prev) => Math.max(prev - 1, 0))}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={createPending}
                >
                  Back
                </button>
              ) : null}
              {createStep < promoStepLabels.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCreateStep((prev) =>
                      Math.min(prev + 1, promoStepLabels.length - 1),
                    )
                  }
                  className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                  disabled={createPending}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateSave}
                  disabled={createPending}
                  className="rounded-full border border-primay bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                >
                  {createPending ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditStep(0);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Promo Code
            </DialogTitle>
          </DialogHeader>
          <form
            ref={editFormRef}
            onSubmit={handleEditSubmit}
            className="space-y-4"
          >
            <input type="hidden" name="promoId" value={editingPromo?.id || ""} />
            <input type="hidden" name="active" value={editActive ? "true" : "false"} />
            <input type="hidden" name="targetProductIds" value={JSON.stringify(editTargetProductIds || [])} />
            <input type="hidden" name="targetCategoryIds" value={JSON.stringify(editTargetCategoryIds || [])} />
            <input type="hidden" name="targetShippable" value={editTargetShippable} />
            <input type="hidden" name="targetProductType" value={editTargetProductType} />
            <div className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 flex flex-wrap gap-2">
              {promoStepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setEditStep(index)}
                  disabled={updatePending}
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                    editStep === index
                      ? "bg-primary text-white"
                      : "bg-white text-[#6B7280] border border-transparent hover:border-primary/40",
                  )}
                >
                  {`${index + 1}. ${label}`}
                </button>
              ))}
            </div>

            <div className={cx("space-y-4", editStep === 0 ? "" : "hidden")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Promo Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="code"
                    type="text"
                    value={editCode}
                    onChange={(event) => setEditCode(event.target.value)}
                    className={cx(
                      "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                      "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                      focusInput,
                      toErrorList(updateState?.errors?.code).length
                        ? hasErrorInput
                        : "",
                    )}
                    disabled={updatePending}
                  />
                  {toErrorList(updateState?.errors?.code).length ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {toErrorList(updateState.errors.code).map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Percent Off <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="percentOff"
                    type="number"
                    min="1"
                    max="100"
                    value={editPercentOff}
                    onChange={(event) => setEditPercentOff(event.target.value)}
                    className={cx(
                      "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                      "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                      focusInput,
                      toErrorList(updateState?.errors?.percentOff).length
                        ? hasErrorInput
                        : "",
                    )}
                    disabled={updatePending}
                  />
                  {toErrorList(updateState?.errors?.percentOff).length ? (
                    <span className="text-[11px] text-red-600">
                      {toErrorList(updateState.errors.percentOff)[0]}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="w-full rounded-xl border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                  rows={2}
                  disabled={updatePending}
                />
              </div>
            </div>

            <div className={cx("space-y-4", editStep === 1 ? "" : "hidden")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Minimum Spend
                  </label>
                  <input
                    name="minSpend"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editMinSpend}
                    onChange={(event) => setEditMinSpend(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2.5 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={updatePending}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Usage Limit
                  </label>
                  <input
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={editUsageLimit}
                    onChange={(event) => setEditUsageLimit(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2.5 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={updatePending}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Per User Limit
                  </label>
                  <input
                    name="perUserLimit"
                    type="number"
                    min="1"
                    value={editPerUserLimit}
                    onChange={(event) => setEditPerUserLimit(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2.5 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={updatePending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Start Date & Time <span className="text-[11px] font-normal text-[#6B7280]">(GMT)</span>
                  </label>
                  <input
                    name="startAt"
                    type="datetime-local"
                    min={getNowUTCString()}
                    value={editStartAt}
                    onChange={(event) => setEditStartAt(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={updatePending}
                  />
                  {toErrorList(updateState?.errors?.startAt).length ? (
                    <span className="text-[11px] text-red-600">
                      {toErrorList(updateState.errors.startAt)[0]}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    End Date & Time <span className="text-[11px] font-normal text-[#6B7280]">(GMT)</span>
                  </label>
                  <input
                    name="endAt"
                    type="datetime-local"
                    min={editStartAt || getNowUTCString()}
                    value={editEndAt}
                    onChange={(event) => setEditEndAt(event.target.value)}
                    className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                    disabled={updatePending}
                  />
                  {toErrorList(updateState?.errors?.endAt).length ? (
                    <span className="text-[11px] text-red-600">
                      {toErrorList(updateState.errors.endAt)[0]}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editActive}
                  onCheckedChange={(checked) => setEditActive(!!checked)}
                  disabled={updatePending}
                />
                <span className="text-xs text-[#0A0A0A]">Active</span>
              </div>
            </div>

            {/* Step 2: Filters */}
            <div className={cx("space-y-4", editStep === 2 ? "" : "hidden")}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#0A0A0A]">Shippability Filter</label>
                  <p className="text-[11px] text-[#6B7280]">
                    Restrict this promo code to products based on whether they require shipping.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SHIPPABLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditTargetShippable(opt.value)}
                        disabled={updatePending}
                        className={cx(
                          "rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors",
                          editTargetShippable === opt.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-[#6B7280] border-[#D1D5DB] hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#0A0A0A]">Product Type Filter</label>
                  <p className="text-[11px] text-[#6B7280]">
                    Restrict this promo code to a specific product type.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditTargetProductType(opt.value)}
                        disabled={updatePending}
                        className={cx(
                          "rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors",
                          editTargetProductType === opt.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-[#6B7280] border-[#D1D5DB] hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Categories */}
            <div className={cx("space-y-4", editStep === 3 ? "" : "hidden")}>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-medium text-[#0A0A0A]">
                    Target Categories (optional)
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">
                    Leave empty to apply to all categories.
                  </p>
                </div>
                <CascadingCategoryPicker
                  categories={categories}
                  selectedCategoryIds={editTargetCategoryIds}
                  onToggleCategory={toggleEditCategory}
                  onClearAll={() => setEditTargetCategoryIds([])}
                  disabled={updatePending}
                />
              </div>
            </div>

            {/* Step 4: Targets */}
            <div className={cx("space-y-4", editStep === 4 ? "" : "hidden")}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-[#0A0A0A]">
                      Target Products (optional)
                    </h3>
                    <p className="text-[11px] text-[#6B7280]">
                      Leave empty to apply to all products.
                    </p>
                  </div>
                  {editTargetProductIds.length ? (
                    <button
                      type="button"
                      onClick={() => setEditTargetProductIds([])}
                      className="text-[11px] text-[#6A7282] hover:text-[#0A0A0A]"
                    >
                      Clear ({editTargetProductIds.length})
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={editProductSearch}
                  onChange={(e) => handleEditProductSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] shadow-sm outline-none"
                  disabled={updatePending}
                />
                <div className="max-h-56 overflow-y-auto rounded-lg border border-[#D1D5DB] bg-white p-3 space-y-2">
                  {editSearchLoading ? (
                    <div className="flex items-center gap-2 py-2 text-[11px] text-[#717182]">
                      <LoaderCircle className="size-3 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : editProductList.length ? (
                    editProductList.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 text-[11px] text-[#111827]"
                      >
                        <input
                          type="checkbox"
                          checked={editProductSet.has(product.id)}
                          onChange={() => toggleEditProduct(product.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                        />
                        <span className="font-medium">
                          {product.name || "Untitled"}
                        </span>
                        {product.vendor?.business_name ? (
                          <span className="text-[#6B7280]">
                            • {product.vendor.business_name}
                          </span>
                        ) : null}
                      </label>
                    ))
                  ) : (
                    <p className="text-[11px] text-[#9CA3AF]">
                      No products found.
                    </p>
                  )}
                </div>
              </div>
            </div>

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
              {editStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setEditStep((prev) => Math.max(prev - 1, 0))}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={updatePending}
                >
                  Back
                </button>
              ) : null}
              {editStep < promoStepLabels.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditStep((prev) =>
                      Math.min(prev + 1, promoStepLabels.length - 1),
                    )
                  }
                  className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                  disabled={updatePending}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={updatePending}
                  className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                >
                  {updatePending ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
