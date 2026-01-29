"use client";
import React, { useState, useEffect, useActionState } from "react";
import {
  PiFileImageLight,
  PiGiftDuotone,
  PiGiftFill,
} from "react-icons/pi";
import Image from "next/image";
import Footer from "../../../../components/footer";
import Advertisement from "../../../../components/advertisement";
import { format } from "date-fns";
import ShareRegistryDialog from "../../components/ShareRegistryDialog";
import { ShoppingCart } from "lucide-react";
import { ProgressBar } from "../../../../components/ProgressBar";
import {
  saveRegistryCoverPhoto,
  removeRegistryCoverPhoto,
} from "./action";
import { toast } from "sonner";
import { useHostRegistryCodeContext } from "./context";

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
  const {
    registry: registryFromContext,
    event: eventFromContext,
    registryItems,
    totals,
  } = useHostRegistryCodeContext() || {};
  const registry = registryFromContext ?? props.registry;
  const event = eventFromContext ?? props.event;
  const [saveState, saveFormAction, isSavePending] = useActionState(
    saveRegistryCoverPhoto,
    initialState
  );
  const [removeState, removeFormAction, isRemovePending] = useActionState(
    removeRegistryCoverPhoto,
    initialState
  );
  const [cover_photo, setCoverPhoto] = useState(null);
  const [cover_photoInput, setCoverPhotoInput] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImageSaved, setIsImageSaved] = useState(false);

  useEffect(() => {
    if (registry?.cover_photo) {
      setCoverPhoto(registry?.cover_photo || null);
      setCoverPhotoInput(registry?.cover_photo || null);
      setIsImageSaved(true);
    }
  }, [registry]);

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
        const num = rawPrice === null || rawPrice === undefined ? NaN : Number(rawPrice);
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
  const desiredQty = totals?.desiredQty ?? products.reduce((s, p) => s + (p.desired ?? 0), 0);
  const purchasedQty = totals?.purchasedQty ?? products.reduce((s, p) => s + (p.purchased ?? 0), 0);

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
              <div className="absolute top-4 right-4 z-10">
                <label
                  htmlFor="cover_photo_file"
                  className="text-[#A5914B] cursor-pointer text-xs font-medium bg-white border border-[#A5914B] hover:bg-[#A5914B] hover:text-white rounded-full px-4 py-2 transition-colors"
                >
                  Edit Cover
                </label>
              </div>

              {/* Save/Remove buttons when unsaved changes */}
              {!isImageSaved && selectedFile && (
                <div className="absolute top-4 right-28 z-10 flex gap-2">
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
                <form action={removeFormAction} className="absolute top-4 right-28 z-10">
                  <input type="hidden" name="registry_id" value={registry.id} readOnly />
                  <input type="hidden" name="event_id" value={event.id} readOnly />
                  <input type="hidden" name="photo_url" value={cover_photo} readOnly />
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
              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10 flex flex-col space-y-2">
                <h1 className="text-white text-2xl font-semibold drop-shadow-lg">
                  {registry?.title || "Registry Name"}
                </h1>
                <p className="text-white text-sm font-medium uppercase tracking-wide drop-shadow">
                  {event?.type || registry?.type || "Event"}
                </p>
                <p className="text-white text-sm drop-shadow">
                  {event?.date
                    ? format(new Date(event.date), "EEEE, MMMM d, yyyy").toUpperCase()
                    : ""}
                </p>
                <button
                  type="button"
                  className="mt-4 text-white text-sm font-medium bg-[#F26B6B] hover:bg-[#E55A5A] rounded-full px-6 py-2 w-fit transition-colors"
                >
                  Welcome Note
                </button>
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
            <div className="w-[250px] flex flex-col space-y-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <p className="text-xs text-[#394B71]">Event Name</p>
              <p className="text-sm text-[#247ACB] font-semibold line-clamp-1 w-full">
                {registry?.title}
              </p>
              <p className="text-xs text-[#B3B3B3]">
                {event?.date ? format(new Date(event.date), "MMMM dd, yyyy") : ""}
              </p>
            </div>
            <div className="flex items-start justify-center space-x-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <PiGiftDuotone className="size-18 text-[#247ACB]" />
              <div className="flex flex-col space-y-2">
                <p className="text-4xl text-[#247ACA] font-semibold">{itemsCount}</p>
                <p className="text-xs text-[#939393]">items</p>
              </div>
            </div>

            {itemsCount?.length ? (
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

            <ShareRegistryDialog event={event} registryCode={registry?.registry_code} />

            <div className="flex items-center flex-col justify-center space-y-2 border border-[#B1C6F2] rounded-md py-4 px-8 bg-[#D3E4F5]">
              <PiGiftFill className="size-10 text-[#247ACB] font-semibold" />
              <p className="text-xs text-[#247ACB]">+ Add Gift</p>
            </div>
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
            <button className="text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center">
              Go to Shop
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col space-y-4">
            <p className="text-[#394B71] font-semibold">View Products</p>
            <div className="flex flex-wrap gap-4">
              {products.map((p) => {
                const isPurchased = (p.purchased ?? 0) >= (p.desired ?? 0) && (p.desired ?? 0) > 0;
                return (
                  <div
                    key={p.id}
                    className="flex bg-white rounded-lg flex-col space-y-4 py-4 w-[200px]"
                  >
                    <div className="flex items-center justify-center px-4">
                      <Image
                        src={p.image}
                        alt={p.title}
                        width={150}
                        height={150}
                        className="object-contain"
                        priority
                      />
                    </div>
                    <div className="flex flex-col space-y-2 w-full">
                      <p className="text-sm font-semibold text-black line-clamp-2 w-full px-4">
                        {p.title}
                      </p>
                      <div className="flex items-center w-full justify-between px-4">
                        <p className="text-xs text-[#939393]">Desired {p.desired}</p>
                        <p className="text-xs text-[#939393]">Purchased {p.purchased}</p>
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
    </div>
  );
}
