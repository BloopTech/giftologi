"use client";
import React, { useState, useEffect, useActionState } from "react";
import Image from "next/image";
import {
  PiFileImageLight,
  PiGiftDuotone,
  PiGiftFill,
  PiDotsThreeVertical,
  PiPencilSimple,
  PiTrash,
} from "react-icons/pi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "../../../../components/footer";
import Advertisement from "../../../../components/advertisement";
import { format } from "date-fns";
import ShareRegistryDialog from "../../components/ShareRegistryDialog";
import { ShoppingCart, X } from "lucide-react";
import { ProgressBar } from "../../../../components/ProgressBar";
import {
  saveRegistryCoverPhoto,
  removeRegistryCoverPhoto,
  updateWelcomeNote,
  updateDeliveryAddress,
  updateRegistryDetails,
  deleteRegistry,
} from "./action";
import { toast } from "sonner";
import { useHostRegistryCodeContext } from "./context";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../../../components/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/Dropdown";
import FormInput from "../../components/registry-builder/FormInput";
import EditRegistryBuilderDialog from "../../components/registry-builder/EditRegistryBuilderDialog";

const initialState = {
  message: "",
  errors: {
    cover_photo: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

export default function HostDashboardRegistryContent(props) {
  const router = useRouter();
  const {
    registry: registryFromContext,
    event: eventFromContext,
    deliveryAddress: deliveryAddressFromContext,
    registryItems,
    totals,
    refresh,
  } = useHostRegistryCodeContext() || {};
  const registry = registryFromContext ?? props.registry;
  const event = eventFromContext ?? props.event;
  const deliveryAddress = deliveryAddressFromContext ?? props.deliveryAddress;
  const [saveState, saveFormAction, isSavePending] = useActionState(
    saveRegistryCoverPhoto,
    initialState,
  );
  const [removeState, removeFormAction, isRemovePending] = useActionState(
    removeRegistryCoverPhoto,
    initialState,
  );
  const [welcomeState, welcomeFormAction, isWelcomePending] = useActionState(
    updateWelcomeNote,
    initialState,
  );
  const [addressState, addressFormAction, isAddressPending] = useActionState(
    updateDeliveryAddress,
    initialState,
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteRegistry,
    initialState,
  );
  const [cover_photo, setCoverPhoto] = useState(null);
  const [cover_photoInput, setCoverPhotoInput] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImageSaved, setIsImageSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeNoteInput, setWelcomeNoteInput] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [addressInput, setAddressInput] = useState({
    street_address: "",
    street_address_2: "",
    city: "",
    state_province: "",
    postal_code: "",
    gps_location: "",
    digital_address: "",
  });

  useEffect(() => {
    if (registry?.cover_photo) {
      setCoverPhoto(registry?.cover_photo || null);
      setCoverPhotoInput(registry?.cover_photo || null);
      setIsImageSaved(true);
    }
  }, [registry]);

  useEffect(() => {
    setWelcomeNoteInput((registry?.welcome_note || "").toString());
  }, [registry?.welcome_note]);

  useEffect(() => {
    setAddressInput({
      street_address: (deliveryAddress?.street_address || "").toString(),
      street_address_2: (deliveryAddress?.street_address_2 || "").toString(),
      city: (deliveryAddress?.city || "").toString(),
      state_province: (deliveryAddress?.state_province || "").toString(),
      postal_code: (deliveryAddress?.postal_code || "").toString(),
      gps_location: (deliveryAddress?.gps_location || "").toString(),
      digital_address: (deliveryAddress?.digital_address || "").toString(),
    });
  }, [deliveryAddress]);

  // Handle save photo success
  useEffect(() => {
    if (saveState.data?.cover_photo_url) {
      setCoverPhoto(saveState.data.cover_photo_url);
      setCoverPhotoInput(saveState.data.cover_photo_url);
      setIsImageSaved(true);
      setSelectedFile(null);
    }

    if (saveState?.message && Object.keys(saveState?.errors || {}).length > 0) {
      toast.error(saveState?.message);
    }

    if (saveState?.message && saveState?.status_code === 200) {
      toast.success(saveState?.message);
    }
  }, [saveState]);

  // Handle remove photo success
  useEffect(() => {
    if (removeState.message === "Photo removed successfully") {
      setCoverPhoto(null);
      setCoverPhotoInput(null);
      setIsImageSaved(false);
      setSelectedFile(null);
    }

    if (
      removeState?.message &&
      Object.keys(removeState?.errors || {}).length > 0
    ) {
      toast.error(removeState?.message);
    }

    if (removeState?.message && removeState?.status_code === 200) {
      toast.success(removeState?.message);
    }
  }, [removeState]);

  useEffect(() => {
    if (
      welcomeState?.message &&
      Object.keys(welcomeState?.errors || {}).length > 0
    ) {
      toast.error(welcomeState?.message);
    }

    if (welcomeState?.message && welcomeState?.status_code === 200) {
      toast.success(welcomeState?.message);
      setWelcomeOpen(false);
      refresh?.();
    }
  }, [welcomeState, refresh]);

  useEffect(() => {
    if (
      addressState?.message &&
      Object.keys(addressState?.errors || {}).length > 0
    ) {
      toast.error(addressState?.message);
    }

    if (addressState?.message && addressState?.status_code === 200) {
      toast.success(addressState?.message);
      setAddressOpen(false);
      refresh?.();
    }
  }, [addressState, refresh]);

  useEffect(() => {
    if (
      deleteState?.message &&
      Object.keys(deleteState?.errors || {}).length > 0
    ) {
      toast.error(deleteState?.message);
    }

    if (deleteState?.message && deleteState?.status_code === 200) {
      toast.success(deleteState?.message);
      setDeleteOpen(false);
      setDeleteConfirmText("");
      router.push("/dashboard/h/registry");
    }
  }, [deleteState, router]);

  useEffect(() => {
    if (!deleteOpen) {
      setDeleteConfirmText("");
    }
  }, [deleteOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverPhotoInput(event.target.result);
        setIsImageSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    // If image is not saved (base64), just clear the local state
    setCoverPhotoInput(null);
    setSelectedFile(null);
    setIsImageSaved(false);
  };

  const products = Array.isArray(registryItems)
    ? registryItems.map((item) => {
        const product = item?.product || {};
        const images = Array.isArray(product.images) ? product.images : [];
        const rawPrice = product.price;
        const num =
          rawPrice === null || rawPrice === undefined ? NaN : Number(rawPrice);
        const price = Number.isFinite(num) ? `GHS ${num.toFixed(2)}` : "";
        return {
          id: item.id,
          title: product.name || "Gift item",
          image: images[0] || "/host/toaster.png",
          price,
          desired: item?.quantity_needed ?? 0,
          purchased: item?.purchased_qty ?? 0,
        };
      })
    : [];

  const itemsCount = totals?.itemsCount ?? products.length;
  const desiredQty =
    totals?.desiredQty ?? products.reduce((s, p) => s + (p.desired ?? 0), 0);
  const purchasedQty =
    totals?.purchasedQty ??
    products.reduce((s, p) => s + (p.purchased ?? 0), 0);

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      {/* <p className="capitalize">
        {profile?.role} Dashboard {profile?.firstname}
      </p> */}
      <main className="flex flex-col space-y-16 w-full">
        <div className="w-full rounded-xl overflow-hidden h-[200px] relative">
          {/* Persistent, hidden form to submit the server action with the real File */}
          <form
            id="saveCoverPhotoForm"
            action={saveFormAction}
            className="hidden"
          >
            <input
              type="hidden"
              name="registry_id"
              value={registry?.id || ""}
              readOnly
            />
            <input
              type="hidden"
              name="event_id"
              value={event?.id || ""}
              readOnly
            />
            <input
              id="cover_photo_file"
              name="cover_photo"
              hidden
              accept="image/*"
              type="file"
              onChange={handleImageChange}
            />
          </form>

          {cover_photoInput ? (
            <>
              {/* Background Image */}
              <Image
                alt={registry?.title || "Cover photo"}
                src={cover_photoInput}
                priority
                className="object-cover"
                fill
                sizes="100vw"
              />

              {/* Edit Cover Button - Top Right */}
              <div className="absolute top-5 right-4 z-1 flex items-center gap-2">
                <label
                  htmlFor="cover_photo_file"
                  className="text-[#A5914B] cursor-pointer text-xs font-medium bg-white border border-[#A5914B] hover:bg-[#A5914B] hover:text-white rounded-full px-4 py-2 transition-colors"
                >
                  Edit Cover
                </label>
              </div>

              {/* Save/Remove buttons when unsaved changes */}
              {!isImageSaved && selectedFile && (
                <div className="absolute top-4 right-28 z-1 flex gap-2">
                  <button
                    type="submit"
                    form="saveCoverPhotoForm"
                    disabled={isSavePending}
                    className="text-white cursor-pointer text-xs font-medium bg-green-600 border border-green-600 hover:bg-white hover:text-green-600 rounded-full px-4 py-2 transition-colors disabled:opacity-50"
                  >
                    {isSavePending ? "Saving..." : "Save"}
                  </button>
                </div>
              )}

              {/* Remove button for saved images */}
              {isImageSaved && cover_photo && (
                <form
                  action={removeFormAction}
                  className="absolute top-4 right-28 z-1"
                >
                  <input
                    type="hidden"
                    name="registry_id"
                    value={registry.id}
                    readOnly
                  />
                  <input
                    type="hidden"
                    name="event_id"
                    value={event.id}
                    readOnly
                  />
                  <input
                    type="hidden"
                    name="photo_url"
                    value={cover_photo}
                    readOnly
                  />
                  <button
                    type="submit"
                    disabled={isRemovePending}
                    className="text-white cursor-pointer text-xs font-medium bg-red-500 border border-red-500 hover:bg-white hover:text-red-500 rounded-full px-4 py-2 transition-colors disabled:opacity-50"
                  >
                    {isRemovePending ? "Removing..." : "Remove"}
                  </button>
                </form>
              )}

              {/* Content Overlay - Left Side */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-1 flex flex-col space-y-2">
                <h1 className="text-white text-2xl font-semibold drop-shadow-lg">
                  {registry?.title || "Registry Name"}
                </h1>
                <p className="text-white text-sm font-medium uppercase tracking-wide drop-shadow">
                  {event?.type || registry?.type || "Event"}
                </p>
                <p className="text-white text-sm drop-shadow">
                  {event?.date
                    ? format(
                        new Date(event.date),
                        "EEEE, MMMM d, yyyy",
                      ).toUpperCase()
                    : ""}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setWelcomeOpen(true)}
                    className="mt-4 cursor-pointer text-white text-sm font-medium bg-[#F26B6B] hover:bg-[#E55A5A] rounded-full px-6 py-2 w-fit transition-colors"
                  >
                    Welcome Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressOpen(true)}
                    className="mt-4 cursor-pointer text-white text-sm font-medium bg-[#247ACB] hover:bg-[#1F69AE] rounded-full px-6 py-2 w-fit transition-colors"
                  >
                    Delivery Address
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#E9E9ED] border border-[#D4D4D4] flex flex-col space-y-4 items-center justify-center">
              <PiFileImageLight className="size-14 text-gray-400" />
              <label
                htmlFor="cover_photo_file"
                className="text-white cursor-pointer text-xs font-medium bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-full px-4 py-2 transition-colors"
              >
                Add a Cover Photo
              </label>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col space-y-4">
          <p className="text-[#394B71] font-semibold">Registry Summary</p>
          <div className="w-full flex space-x-4 flex-wrap">
            <div className="w-[250px] flex flex-col space-y-2 border border-[#DCDCDE] rounded-md p-4 bg-white relative">
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                      <PiDotsThreeVertical className="w-5 h-5 text-[#6B7280]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12}>
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                      <span className="flex items-center gap-2">
                        <PiPencilSimple className="w-4 h-4" />
                        Edit registry
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>
                      <span className="flex items-center gap-2 text-red-600">
                        <PiTrash className="w-4 h-4" />
                        Delete registry
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-[#394B71]">Event Name</p>
              <p className="text-sm text-[#247ACB] font-semibold line-clamp-1 w-full">
                {registry?.title}
              </p>
              <p className="text-xs text-[#B3B3B3]">
                {event?.date
                  ? format(new Date(event.date), "MMMM dd, yyyy")
                  : ""}
              </p>
            </div>
            <div className="flex items-start justify-center space-x-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <PiGiftDuotone className="size-18 text-[#247ACB]" />
              <div className="flex flex-col space-y-2">
                <p className="text-4xl text-[#247ACA] font-semibold">
                  {itemsCount}
                </p>
                <p className="text-xs text-[#939393]">items</p>
              </div>
            </div>

            {itemsCount > 0 ? (
              <div className="flex items-center justify-center space-x-4 rounded-md py-4 px-4 bg-white border border-[#DCDCDE]">
                <ShoppingCart className="size-12 text-[#247ACA] font-semibold" />
                <div className="flex flex-col space-y-1">
                  <p className="text-xs text-[#939393] ">
                    <span className="text-2xl text-[#939393]">
                      <span className="font-semibold text-[#247ACA]">
                        {purchasedQty}
                      </span>
                      /{desiredQty || 0}{" "}
                    </span>{" "}
                    products purchased
                  </p>
                  <ProgressBar value={purchasedQty} max={desiredQty || 1} />
                </div>
              </div>
            ) : null}

            <ShareRegistryDialog
              event={event}
              registryCode={registry?.registry_code}
            />

            <Link
              href={
                registry?.registry_code
                  ? `/shop?registry_code=${registry.registry_code}`
                  : "/shop"
              }
              className="flex items-center flex-col justify-center space-y-2 border border-[#B1C6F2] rounded-md py-4 px-8 bg-[#D3E4F5] cursor-pointer hover:bg-[#C2D7F9] transition-colors"
            >
              <PiGiftFill className="size-10 text-[#247ACB] font-semibold" />
              <p className="text-xs text-[#247ACB]">+ Add Gift</p>
            </Link>
          </div>
        </div>

        {itemsCount === 0 ? (
          <div className="flex items-center justify-center mx-auto max-w-md w-full rounded-4xl border border-[#A9C4FC] px-4 py-8 bg-white flex-col space-y-4">
            <div className="inline-block">
              <Image
                src="/host/open-gift.svg"
                alt="open gift"
                width={100}
                height={100}
                className="object-contain"
                priority
              />
            </div>
            <p className="text-[#394B71] font-semibold text-center text-sm">
              Your registry is empty.
              <br /> Add items from the Shop to get started.
            </p>
            <Link
              href={
                registry?.registry_code
                  ? `/shop?registry_code=${registry.registry_code}`
                  : "/shop"
              }
              className="text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center"
            >
              Go to Shop
            </Link>
          </div>
        ) : (
          <div className="w-full flex flex-col space-y-4">
            <p className="text-[#394B71] font-semibold">View Products</p>
            <div className="flex flex-wrap gap-4">
              {products.map((p) => {
                const isPurchased =
                  (p.purchased ?? 0) >= (p.desired ?? 0) &&
                  (p.desired ?? 0) > 0;
                return (
                  <div
                    key={p.id}
                    className="group flex bg-white rounded-lg flex-col space-y-4 w-[200px] overflow-hidden border border-gray-200"
                  >
                    <div className="relative aspect-square overflow-hidden w-full">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                    <div className="flex flex-col space-y-2 w-full pb-4">
                      <p className="text-sm font-semibold text-black line-clamp-2 w-full px-4">
                        {p.title}
                      </p>
                      <div className="flex items-center w-full justify-between px-4">
                        <p className="text-xs text-[#939393]">
                          Desired {p.desired}
                        </p>
                        <p className="text-xs text-[#939393]">
                          Purchased {p.purchased}
                        </p>
                      </div>
                      <div className="flex items-center w-full justify-between pl-4">
                        <p className="text-xs text-[#939393]">{p.price}</p>
                        {isPurchased ? (
                          <p className="text-xs text-white bg-[#8DC76C] border border-[#8DC76C] rounded-l-xl px-2 py-1 flex items-center">
                            Purchased
                          </p>
                        ) : (
                          <button className="text-xs text-white cursor-pointer bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-l-xl px-2 py-1 flex items-center">
                            View Product
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Advertisement />

        <Footer />
      </main>

      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent className="w-full max-w-lg rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
            Welcome Note
          </DialogTitle>

          <form action={welcomeFormAction} className="space-y-4">
            <input
              type="hidden"
              name="registry_id"
              value={registry?.id || ""}
              readOnly
            />
            <input
              type="hidden"
              name="event_id"
              value={event?.id || ""}
              readOnly
            />
            <textarea
              name="welcome_note"
              value={welcomeNoteInput}
              onChange={(e) => setWelcomeNoteInput(e.target.value)}
              rows={7}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
              placeholder="Write a short welcome message for guests"
              disabled={isWelcomePending}
            />

            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={isWelcomePending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={isWelcomePending}
                className="px-5 py-2 text-sm font-medium text-white bg-[#A5914B] border border-[#A5914B] rounded-full hover:bg-white hover:text-[#A5914B] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isWelcomePending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addressOpen} onOpenChange={setAddressOpen}>
        <DialogContent className="w-full max-w-2xl rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
            Delivery Address
          </DialogTitle>

          <form action={addressFormAction} className="space-y-4">
            <input
              type="hidden"
              name="registry_id"
              value={registry?.id || ""}
              readOnly
            />
            <input
              type="hidden"
              name="event_id"
              value={event?.id || ""}
              readOnly
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                name="street_address"
                value={addressInput.street_address}
                onChange={(e) =>
                  setAddressInput((prev) => ({
                    ...prev,
                    street_address: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                placeholder="Street address"
                disabled={isAddressPending}
              />
              <input
                name="street_address_2"
                value={addressInput.street_address_2}
                onChange={(e) =>
                  setAddressInput((prev) => ({
                    ...prev,
                    street_address_2: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                placeholder="Street address line 2"
                disabled={isAddressPending}
              />
              <input
                name="city"
                value={addressInput.city}
                onChange={(e) =>
                  setAddressInput((prev) => ({ ...prev, city: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                placeholder="City"
                disabled={isAddressPending}
              />
              <input
                name="state_province"
                value={addressInput.state_province}
                onChange={(e) =>
                  setAddressInput((prev) => ({
                    ...prev,
                    state_province: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                placeholder="State/Province"
                disabled={isAddressPending}
              />
              <input
                name="postal_code"
                value={addressInput.postal_code}
                onChange={(e) =>
                  setAddressInput((prev) => ({
                    ...prev,
                    postal_code: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                placeholder="Postal / Zip Code"
                disabled={isAddressPending}
              />
              <input
                name="digital_address"
                value={addressInput.digital_address}
                onChange={(e) =>
                  setAddressInput((prev) => ({
                    ...prev,
                    digital_address: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                placeholder="Digital address"
                disabled={isAddressPending}
              />
            </div>

            <input
              name="gps_location"
              value={addressInput.gps_location}
              onChange={(e) =>
                setAddressInput((prev) => ({
                  ...prev,
                  gps_location: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
              placeholder="GPS Location (Google Maps link or coordinates)"
              disabled={isAddressPending}
            />

            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={isAddressPending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={isAddressPending}
                className="px-5 py-2 text-sm font-medium text-white bg-[#A5914B] border border-[#A5914B] rounded-full hover:bg-white hover:text-[#A5914B] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAddressPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-full max-w-2xl rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
            Edit Registry
          </DialogTitle>

          <EditRegistryBuilderDialog
            action={updateRegistryDetails}
            registry={registry}
            event={event}
            deliveryAddress={deliveryAddress}
            onClose={() => setEditOpen(false)}
            onSuccess={() => {
              setEditOpen(false);
              refresh?.();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-full max-w-lg rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
            Delete Registry
          </DialogTitle>
          <p className="text-sm text-gray-600 mb-4">
            This action cannot be undone. Type <span className="font-semibold">DELETE REGISTRY</span>
            to confirm.
          </p>

          <form action={deleteFormAction} className="space-y-4">
            <input
              type="hidden"
              name="registry_id"
              value={registry?.id || ""}
              readOnly
            />
            <input
              type="hidden"
              name="event_id"
              value={event?.id || ""}
              readOnly
            />
            <input
              type="hidden"
              name="redirect_to"
              value="/dashboard/h/registry"
              readOnly
            />
            {deleteState?.message &&
            Object.keys(deleteState?.errors || {}).length > 0 ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {deleteState.message}
              </p>
            ) : null}

            <FormInput
              label="Confirmation"
              name="confirm_text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE REGISTRY"
              required
              disabled={isDeletePending}
              error={deleteState?.errors?.confirm_text}
            />

            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={isDeletePending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={isDeletePending}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-full hover:bg-white hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeletePending ? "Deleting..." : "Delete registry"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
