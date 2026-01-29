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
import { LoaderCircle } from "lucide-react";

function RegistryContentInner() {
  const {
    registry,
    event,
    host,
    hostDisplayName,
    products,
    shippingAddress,
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
  } = useGuestRegistryCodeContext();

  const hasProducts = Array.isArray(products) && products.length > 0;

  // Category options for filter
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
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen px-4">
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

        {/* Products Section */}
        <div className="w-full rounded-3xl border border-[#DCDCDE] p-6 bg-white flex flex-col space-y-6">
          {/* Header with filters */}
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
            <div className="flex items-center gap-2">
              <div className="min-w-[180px]">
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
              <div className="min-w-[180px]">
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

          {/* Products Grid */}
          {hasProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={openProductDetail}
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

        <Advertisement />

        <Footer />
      </main>

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
