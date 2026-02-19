"use client";
import React, { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import {
  PiArrowLeft,
  PiGift,
  PiStar,
  PiStarFill,
} from "react-icons/pi";
import Footer from "../../components/footer";
import { useGuideDetailContext } from "./context";
import {
  Search,
  ShoppingCart,
  Zap,
  Loader2,
  Gift,
  Check,
  Trash2,
  Store,
  BadgeCheck,
  ExternalLink,
  X,
  Filter,
  Grid3X3,
  LayoutList,
} from "lucide-react";
import CartDrawer from "../../shop/components/CartDrawer";
import AddToRegistryModal from "../../shop/components/AddToRegistryModal";
import { removeProductFromRegistry } from "../../shop/actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/Select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../components/Dialog";

const SORT_OPTIONS = [
  { id: "guide", label: "Guide Order" },
  { id: "relevance", label: "Relevance" },
  { id: "newest", label: "Newest First" },
  { id: "popular", label: "Most Popular" },
  { id: "rating", label: "Best Rated" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "name_asc", label: "Name: A to Z" },
  { id: "name_desc", label: "Name: Z to A" },
];

const TYPE_OPTIONS = [
  { id: "all", label: "All Types" },
  { id: "physical", label: "Physical" },
  { id: "treat", label: "Treats" },
  { id: "digital", label: "Digital" },
];

const removeInitialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

function GuideProductDetailModal({ open, onOpenChange, product }) {
  const removeToastKeyRef = useRef(0);
  const {
    getRegistryItem,
    openAddToRegistry,
    addToCart,
    buyNow,
    removeFromCart,
    addingToCartId,
    buyingProductId,
    removingFromCartId,
    isHost,
    isInCart,
  } = useGuideDetailContext();

  const [removeState, removeAction, isRemovePending] = useActionState(
    removeProductFromRegistry,
    removeInitialState
  );

  useEffect(() => {
    if (!removeState?.message) return;
    const toastKey = JSON.stringify({
      message: removeState.message,
      registryItemId: removeState?.data?.registryItemId || null,
      errorKeys: Object.keys(removeState?.errors || {}).join(","),
    });
    if (removeToastKeyRef.current === toastKey) return;

    if (Object.keys(removeState?.errors || {}).length > 0) {
      toast.error(removeState.message);
    } else {
      toast.success(removeState.message);
      if (removeState?.data?.registryItemId) {
        onOpenChange(false);
        window.dispatchEvent(new CustomEvent("registry-item-updated"));
      }
    }

    removeToastKeyRef.current = toastKey;
  }, [removeState, onOpenChange]);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const registryItem = getRegistryItem?.(product.id);
  const isInRegistry = !!registryItem;
  const isAdding = addingToCartId === product.id;
  const isBuying = buyingProductId === product.id;
  const isRemoving = removingFromCartId === product.id;
  const inCart = isInCart(product.id);

  const storeLink =
    product?.vendor?.slug && product?.productCode
      ? `/storefront/${product.vendor.slug}/${product.productCode}`
      : product?.vendor?.slug
      ? `/storefront/${product.vendor.slug}`
      : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl rounded-2xl shadow-xl p-0 overflow-hidden">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer z-10 bg-white/80 backdrop-blur-sm">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 bg-gray-50 p-8 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[300px]">
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                fill
                className="object-contain"
                sizes="300px"
                priority
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                  <span className="bg-red-600 text-white px-4 py-2 rounded-full font-medium">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 flex flex-col">
            <Link
              href={`/storefront/${product.vendor?.slug}`}
              className="flex items-center gap-2 mb-4 group"
            >
              <Store className="size-4 text-gray-400 group-hover:text-[#A5914B]" />
              <span className="text-sm text-gray-500 group-hover:text-[#A5914B] transition-colors">
                {product.vendor?.name}
              </span>
              {product.vendor?.verified && <BadgeCheck className="size-4 text-blue-500" />}
              <ExternalLink className="size-3 text-gray-400 group-hover:text-[#A5914B]" />
            </Link>

            <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
              {product.name}
            </DialogTitle>

            <div className="flex items-center gap-3 mb-4">
              <p className="text-2xl font-bold text-[#A5914B]">{product.price}</p>
              {product?.isOnSale && product?.originalPrice && (
                <p className="text-lg text-gray-400 line-through">{product.originalPrice}</p>
              )}
              {product?.isOnSale && product?.discountPercent > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                  {product.discountPercent}% OFF
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              {product.stock > 0 ? (
                <span className="text-sm text-green-600 font-medium">
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="text-sm text-red-600 font-medium">Out of Stock</span>
              )}
            </div>

            {product.description && (
              <div className="mb-6 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6">
                  {product.description}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-auto">
              {!isOutOfStock && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => buyNow(product)}
                    disabled={isBuying || isAdding}
                    className="flex-1 text-sm px-4 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />
                        Buy Now
                      </>
                    )}
                  </button>

                  {inCart ? (
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      disabled={isRemoving}
                      className="flex-1 text-sm px-4 py-3 border border-green-300 bg-green-50 text-green-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isRemoving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="size-4" />
                          In Cart
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={isAdding || isBuying}
                      className="flex-1 text-sm px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="size-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {isHost && !isOutOfStock && !isInRegistry && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    openAddToRegistry(product);
                  }}
                  className="w-full text-sm px-4 py-3 bg-[#A5914B]/10 text-[#8B7A3F] font-medium rounded-full hover:bg-[#A5914B]/20 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#A5914B]/30"
                >
                  <Gift className="size-4" />
                  Add to Registry
                </button>
              )}

              {isHost && isInRegistry && (
                <div className="flex gap-2">
                  <div className="flex-1 text-sm px-4 py-3 bg-green-50 text-green-700 font-medium rounded-full flex items-center justify-center gap-2 border border-green-200">
                    <Check className="size-4" />
                    In Registry
                  </div>
                  <form action={removeAction} className="flex-1">
                    <input
                      type="hidden"
                      name="registryItemId"
                      value={registryItem?.id || ""}
                      readOnly
                    />
                    <button
                      type="submit"
                      disabled={isRemovePending}
                      className="w-full text-sm px-4 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isRemovePending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="size-4" />
                          Remove
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {isOutOfStock && (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-gray-200 text-gray-500 font-medium rounded-full cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}

              <Link
                href={storeLink}
                className="w-full flex items-center justify-center px-4 text-sm py-2.5 text-gray-500 hover:text-[#A5914B] font-medium transition-colors"
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                View in Store
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductCard({ product, viewMode = "grid" }) {
  const {
    openProductDetail,
    addToCart,
    buyNow,
    removeFromCart,
    addingToCartId,
    buyingProductId,
    removingFromCartId,
    isHost,
    isProductInRegistry,
    isInCart,
    openAddToRegistry,
  } = useGuideDetailContext();

  if (!product) return null;

  const p = product;
  const isAdding = addingToCartId === p.id;
  const isBuying = buyingProductId === p.id;
  const isRemoving = removingFromCartId === p.id;
  const inRegistry = isProductInRegistry(p.id);
  const inCart = isInCart(p.id);
  const isList = viewMode === "list";

  if (isList) {
    return (
      <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 flex">
        <button
          type="button"
          onClick={() => openProductDetail(p)}
          className="relative w-32 md:w-44 shrink-0 bg-gray-50 overflow-hidden"
        >
          <ImageWithFallback
            src={p.image}
            alt={p.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 128px, 176px"
            priority
          />
        </button>
        <div className="flex-1 p-4">
          {/* <Link
            href={`/storefront/${p.vendor?.slug}`}
            className="text-xs text-gray-500 hover:text-[#A5914B] inline-flex items-center gap-1"
          >
            <Store className="size-3" />
            {p.vendor?.name}
            {p.vendor?.verified && <BadgeCheck className="size-3 text-blue-500" />}
          </Link> */}
          <button
            type="button"
            onClick={() => openProductDetail(p)}
            className="block text-left text-base font-medium text-gray-900 mt-1 hover:text-[#A5914B] line-clamp-2 cursor-pointer"
          >
            {p.name}
          </button>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold text-[#A5914B]">{p.price}</span>
            {p.isOnSale && p.originalPrice && (
              <span className="text-sm text-gray-400 line-through">{p.originalPrice}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {inCart ? (
              <button
                type="button"
                onClick={() => removeFromCart(p.id)}
                disabled={isRemoving}
                className="text-xs px-4 py-1.5 border border-green-300 bg-green-50 text-green-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer group/cart"
              >
                {isRemoving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <>
                    <Check className="size-3 group-hover/cart:hidden" />
                    <Trash2 className="size-3 hidden group-hover/cart:block" />
                    <span className="group-hover/cart:hidden">In Cart</span>
                    <span className="hidden group-hover/cart:inline">Remove</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => buyNow(p)}
                  disabled={isBuying || isAdding || p.stock <= 0}
                  className="text-xs px-4 py-1.5 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  {isBuying ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <Zap className="size-3" />
                      Buy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={isAdding || isBuying || p.stock <= 0}
                  className="text-xs px-4 py-1.5 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  {isAdding ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="size-3" />
                      Add to Cart
                    </>
                  )}
                </button>
              </>
            )}

            {isHost && p.stock > 0 && (
              <>
                {inRegistry ? (
                  <span className="text-xs px-3 py-1.5 bg-green-50 text-green-700 font-medium rounded-full border border-green-200 flex items-center gap-1">
                    <Check className="size-3" />
                    In Registry
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAddToRegistry(p)}
                    className="text-xs px-4 py-1.5 bg-[#A5914B]/10 text-[#8B7A3F] font-medium rounded-full border border-[#A5914B]/30 hover:bg-[#A5914B]/20 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Gift className="size-3" />
                    Add to Registry
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300">
      <button
        type="button"
        onClick={() => openProductDetail(p)}
        className="relative aspect-square bg-gray-50 overflow-hidden block w-full"
      >
        {p.image ? (
          <ImageWithFallback
            src={p.image}
            alt={p.name}
            fill
            priority
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PiGift className="w-10 h-10 text-[#D1D5DB]" />
          </div>
        )}

        {p.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {p.vendor?.verified && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              <BadgeCheck className="size-3" />
            </span>
          </div>
        )}

        {p.isOnSale && p.stock > 0 && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {p.discountPercent}% OFF
            </span>
          </div>
        )}
      </button>

      <div className="p-3">
        {/* <Link
          href={`/storefront/${p.vendor?.slug}`}
          className="text-[11px] text-gray-500 hover:text-[#A5914B] inline-flex items-center gap-1"
        >
          <Store className="size-3" />
          {p.vendor?.name}
        </Link> */}

        <button
          type="button"
          onClick={() => openProductDetail(p)}
          className="block text-left text-sm font-medium text-gray-900 mt-1 hover:text-[#A5914B] line-clamp-2 cursor-pointer"
        >
          {p.name}
        </button>

        {p.avgRating > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) =>
              i < Math.round(p.avgRating) ? (
                <PiStarFill key={i} className="w-3 h-3 text-[#FBBF24]" />
              ) : (
                <PiStar key={i} className="w-3 h-3 text-[#D1D5DB]" />
              )
            )}
            <span className="text-[10px] text-[#6B7280] ml-1">
              ({p.reviewCount || 0})
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-base font-bold text-[#A5914B]">{p.price}</span>
          {p.isOnSale && p.originalPrice && (
            <span className="text-[10px] text-[#9CA3AF] line-through">
              {p.originalPrice}
            </span>
          )}
        </div>

        {p.editorNote && (
          <p className="text-[10px] text-[#A5914B] mt-2 italic line-clamp-2">
            &quot;{p.editorNote}&quot;
          </p>
        )}

        {p.stock > 0 && (
          <div className="flex gap-1.5 mt-3">
            {inCart ? (
              <button
                type="button"
                onClick={() => removeFromCart(p.id)}
                disabled={isRemoving}
                className="flex-1 text-xs px-2 py-1.5 border border-green-300 bg-green-50 text-green-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer group/cart"
              >
                {isRemoving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <>
                    <Check className="size-3 group-hover/cart:hidden" />
                    <Trash2 className="size-3 hidden group-hover/cart:block" />
                    <span className="group-hover/cart:hidden">In Cart</span>
                    <span className="hidden group-hover/cart:inline">Remove</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => buyNow(p)}
                  disabled={isBuying || isAdding}
                  className="flex-1 text-xs px-2 py-1.5 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isBuying ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <Zap className="size-3" />
                      Buy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={isAdding || isBuying}
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isAdding ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="size-3" />
                      Add to Cart
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {isHost && p.stock > 0 && (
          <>
            {inRegistry ? (
              <div className="mt-1.5 w-full text-xs px-2 py-1.5 bg-green-50 text-green-700 font-medium rounded-full border border-green-200 flex items-center justify-center gap-1">
                <Check className="size-3" />
                In Registry
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAddToRegistry(p)}
                className="mt-1.5 w-full text-xs px-2 py-1.5 bg-[#A5914B]/10 text-[#8B7A3F] font-medium rounded-full border border-[#A5914B]/30 hover:bg-[#A5914B]/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Gift className="size-3" />
                Add to Registry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function GuideDetailContent() {
  const {
    guide,
    products,
    loading,
    error,
    occasionLabels,
    budgetLabels,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    typeFilter,
    setTypeFilter,
    inStockOnly,
    setInStockOnly,
    clearFilters,
    hasActiveFilters,
    cartCount,
    selectedProduct,
    productDetailOpen,
    closeProductDetail,
    removingFromCartId,
    refreshCart,
    addToRegistryOpen,
    addToRegistryProduct,
    closeAddToRegistry,
    registry,
  } = useGuideDetailContext();

  const [viewMode, setViewMode] = useState("grid");
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch.trim());
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery]);

  const guideItemsCount = useMemo(() => products.length, [products]);

  if (loading) {
    return (
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-6 w-48 bg-[#E5E7EB] rounded animate-pulse mb-4" />
          <div className="h-40 bg-[#E5E7EB] rounded-2xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-[#E5E7EB] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !guide) {
    return (
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="text-sm text-red-600">{error || "Guide not found"}</p>
          <Link
            href="/gift-guides"
            className="mt-3 inline-flex items-center gap-1 text-sm text-[#A5914B] hover:underline"
          >
            <PiArrowLeft className="w-4 h-4" /> All Guides
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10 pt-24">
          {/* Back */}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-8 border-b border-gray-200">
            <div>
              <Link
                href="/gift-guides"
                className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#A5914B] mb-6 transition"
              >
                <PiArrowLeft className="w-4 h-4" /> Gift Guides
              </Link>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
                {guide?.title}
              </h1>
              <p className="text-gray-500 font-sans max-w-xl">
                {guide?.description ||
                  "Browse our curated collection of gifts from verified vendors. Selected with refined taste in mind."}
              </p>
              <div className="flex items-center gap-2 mt-4">
                {guide?.occasion && (
                  <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2.5 py-1 rounded-full">
                    {occasionLabels[guide.occasion] || guide.occasion}
                  </span>
                )}
                {guide?.budget_range && (
                  <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2.5 py-1 rounded-full">
                    {budgetLabels[guide.budget_range] || guide.budget_range}
                  </span>
                )}
                <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2.5 py-1 rounded-full">
                  {guideItemsCount} {guideItemsCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
          </div>
          {/* Filter */}
          <div className="mt-12 w-full">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={localSearch}
                  placeholder="Search gifts..."
                  className="w-full bg-gray-50 border-none rounded-lg py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#FDD17D] transition-all"
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Guide Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`flex items-center gap-2 border px-4 py-3 rounded-lg text-xs font-bold transition-colors ${
                    inStockOnly
                      ? "bg-[#A5914B] text-white border-[#A5914B]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#FDD17D]"
                  }`}
                >
                  <Filter size={14} /> In Stock
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#8B7A3F] hover:text-[#6F6136]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* View Toggles */}
              <div className="hidden lg:flex items-center gap-2 border-l border-gray-100 pl-4">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#FDD17D] text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-900"
                  }`}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-[#FDD17D] text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-900"
                  }`}
                >
                  <LayoutList size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Products grid */}
          <div className="w-full mt-16">
            {products.length === 0 ? (
              <div className="text-center py-16">
                <PiGift className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" />
                <p className="text-sm text-[#6B7280]">
                  {hasActiveFilters
                    ? "No products matched your search and filters."
                    : "No products in this guide yet."}
                </p>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} viewMode="grid" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} viewMode="list" />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#A5914B] text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-[#8B7A3F] hover:shadow-xl transition-all"
          aria-label={`View cart with ${cartCount} items`}
        >
          <span className="relative">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2.5 bg-white text-[#A5914B] text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
              {cartCount}
            </span>
          </span>
          <span className="text-sm font-semibold ml-1">View Cart</span>
        </button>
      )}

      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartCount={cartCount}
        removingFromCartId={removingFromCartId}
        onCartChanged={refreshCart}
      />

      <GuideProductDetailModal
        open={productDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeProductDetail();
        }}
        product={selectedProduct}
      />

      <AddToRegistryModal
        open={addToRegistryOpen}
        onOpenChange={(open) => {
          if (!open) closeAddToRegistry();
        }}
        product={addToRegistryProduct}
        registry={registry}
      />

      <Footer />
    </>
  );
}
