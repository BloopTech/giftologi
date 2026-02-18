"use client";
import React, { Suspense } from "react";
import RegistryPageViewTracker from "../../components/RegistryPageViewTracker";
import Footer from "../../components/footer";
import Advertisement from "../../components/advertisement";
import Link from "next/link";
import { useGuestRegistryCodeContext } from "./context";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/Select";
import {
  HeroBanner,
  WelcomeNoteModal,
  ProductCard,
  ProductDetailModal,
  GifterInfoModal,
  AddMessageModal,
  PurchaseCompleteModal,
} from "./components";
import { LoaderCircle, ShoppingCart } from "lucide-react";

function RegistryContentInner() {
  const {
    registry,
    event,
    host,
    hostDisplayName,
    products,
    shippingAddress,
    shippingRegions,
    defaultShippingRegionId,
    categories,
    welcomeNoteOpen,
    setWelcomeNoteOpen,
    productDetailOpen,
    setProductDetailOpen,
    gifterInfoOpen,
    setGifterInfoOpen,
    addMessageOpen,
    setAddMessageOpen,
    purchaseCompleteOpen,
    setPurchaseCompleteOpen,
    selectedProduct,
    completedOrderId,
    isProcessing,
    error,
    setError,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    hideFullyPurchased,
    setHideFullyPurchased,
    openProductDetail,
    closeProductDetail,
    startBuyThis,
    startBuyMultiple,
    handleGifterInfoSubmit,
    handleGifterInfoSkip,
    handleMessageSubmit,
    handleMessageSkip,
    handleTrackOrder,
    handleContinueShopping,
    cartCount,
    addToCart,
    addingProductId,
    cartProductIds,
    removeFromCart,
    goToCheckout,
    accessDenied,
    isLoading,
  } = useGuestRegistryCodeContext();

  if (accessDenied) {
    return (
      <div className="dark:text-white bg-[#FAFAFA] dark:bg-gray-950 min-h-screen flex items-center justify-center px-4 font-brasley-medium">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v.01M12 9v3m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            This registry is invite-only
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You need an invitation from the host to view this registry.
            If you believe you should have access, please log in with the
            email address that was invited.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/find-registry"
              className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
            >
              Find a public registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasProducts = Array.isArray(products) && products.length > 0;

  // Category options — already filtered to this registry via denormalized category_ids
  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  // Sort options
  const sortOptions = [
    { value: "default", label: "Default" },
    { value: "name", label: "Name" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "available", label: "Most Available" },
  ];

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-brasley-medium min-h-screen px-4">
      <Link
        href="#registry-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </Link>
      <RegistryPageViewTracker registryId={registry?.id} />

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-white hover:text-red-100 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-[#A5914B]" />
            <p className="text-gray-700 font-medium">Processing payment...</p>
          </div>
        </div>
      )}

      <main
        id="registry-main-content"
        role="main"
        tabIndex={-1}
        aria-label={`${registry?.title || "Registry"} gift list`}
        className="flex flex-col space-y-8 w-full"
      >
        {/* Hero Banner */}
        <HeroBanner
          registry={registry}
          event={event}
          host={host}
          onWelcomeNoteClick={() => setWelcomeNoteOpen(true)}
        />

        {completedOrderId && (
          <section className="w-full rounded-3xl border border-[#E5E7EB] bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6A7282]">
                Order Code
              </p>
              <p className="text-lg font-semibold text-[#111827] mt-1">
                {completedOrderId}
              </p>
              <p className="text-sm text-[#6A7282] mt-1">
                Track delivery updates or look up another order anytime.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href={`/order/${completedOrderId}`}
                className="inline-flex items-center justify-center rounded-full bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F2937]"
              >
                Track order
              </Link>
              <Link
                href="/order/lookup"
                className="inline-flex items-center justify-center rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                Look up order
              </Link>
            </div>
          </section>
        )}

        {/* Products Section */}
        <div className="w-full rounded-3xl border border-[#DCDCDE] p-6 bg-white flex flex-col space-y-6">
          {/* Header with filters */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full flex-wrap gap-4">
              <div className="flex flex-col">
                <h2 className="text-[#394B71] text-xl font-semibold">
                  Gift Registry
                </h2>
                {hostDisplayName && (
                  <span className="text-xs text-[#6A7282]">
                    Hosted by {hostDisplayName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="min-w-[160px]">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="border-[#DCDCDE] text-[#A5914B]">
                      <SelectValue placeholder="Gift Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px]">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border-[#DCDCDE] text-[#A5914B]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Price range + availability filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-[#6A7282] whitespace-nowrap">Price</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Min"
                  className="w-20 rounded-lg border border-[#DCDCDE] px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none hover:border-[#A5914B] focus:border-[#A5914B] transition"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Max"
                  className="w-20 rounded-lg border border-[#DCDCDE] px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none hover:border-[#A5914B] focus:border-[#A5914B] transition"
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideFullyPurchased}
                  onChange={(e) => setHideFullyPurchased(e.target.checked)}
                  className="accent-[#A5914B] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-xs text-[#6A7282]">Hide fulfilled</span>
              </label>
              {(priceMin || priceMax || hideFullyPurchased || (categoryFilter && categoryFilter !== "all")) && (
                <button
                  type="button"
                  onClick={() => {
                    setPriceMin("");
                    setPriceMax("");
                    setHideFullyPurchased(false);
                    setCategoryFilter("all");
                    setSortBy("default");
                  }}
                  className="text-xs text-[#A5914B] hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          {hasProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={openProductDetail}
                  onAddToCart={(p) => addToCart(p, 1)}
                  onRemoveFromCart={removeFromCart}
                  cartLoading={addingProductId === (product.productId || product.id)}
                  isInCart={cartProductIds.has(product.productId || product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-[#6A7282] mb-2">
                No gifts have been added to this registry yet.
              </p>
              <p className="text-sm text-gray-400">
                Check back soon for updates!
              </p>
            </div>
          )}
        </div>

        {/* Floating Cart Badge */}
        {cartCount > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              type="button"
              onClick={goToCheckout}
              className="flex items-center gap-2 bg-[#A5914B] text-white px-5 py-3 rounded-full shadow-lg hover:bg-[#8B7A3F] transition-all hover:scale-105 cursor-pointer"
            >
              <ShoppingCart className="size-5" />
              <span className="font-semibold">Checkout</span>
              <span className="bg-white text-[#A5914B] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          </div>
        )}

        <Advertisement />
      </main>
      <Footer />

      {/* Modals */}
      <WelcomeNoteModal
        open={welcomeNoteOpen}
        onOpenChange={setWelcomeNoteOpen}
        registry={registry}
        event={event}
        host={host}
        welcomeNote={registry?.welcome_note}
      />

      <ProductDetailModal
        open={productDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeProductDetail();
          else setProductDetailOpen(open);
        }}
        product={selectedProduct}
        shippingAddress={shippingAddress}
        shippingInstructions={registry?.shipping_instructions}
        onBuyThis={startBuyThis}
        onBuyMultiple={startBuyMultiple}
        onRemoveFromCart={removeFromCart}
        isInCart={cartProductIds.has(selectedProduct?.productId || selectedProduct?.id)}
      />

      <GifterInfoModal
        open={gifterInfoOpen}
        onOpenChange={setGifterInfoOpen}
        product={selectedProduct}
        hostName={hostDisplayName}
        onSubmit={handleGifterInfoSubmit}
        onSkip={handleGifterInfoSkip}
      />

      <AddMessageModal
        open={addMessageOpen}
        onOpenChange={setAddMessageOpen}
        product={selectedProduct}
        hostName={hostDisplayName}
        shippingRegions={shippingRegions}
        defaultShippingRegionId={defaultShippingRegionId}
        onSubmit={handleMessageSubmit}
        onSkip={handleMessageSkip}
      />

      <PurchaseCompleteModal
        open={purchaseCompleteOpen}
        onOpenChange={setPurchaseCompleteOpen}
        orderId={completedOrderId}
        onTrackOrder={handleTrackOrder}
        onContinueShopping={handleContinueShopping}
      />
    </div>
  );
}

export default function PublicRegistryContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#A5914B]" />
        </div>
      }
    >
      <RegistryContentInner />
    </Suspense>
  );
}
