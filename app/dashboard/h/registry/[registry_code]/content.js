"use client";
import React, { useState, useEffect, useActionState } from "react";
import { PiFileImageLight, PiGiftDuotone, PiShareBold } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../../../components/footer";
import Advertisement from "../../../../components/advertisement";
import { format } from "date-fns";
import ShareRegistryDialog from "../../components/ShareRegistryDialog";
import updateRegistryAction, {
  saveRegistryCoverPhoto,
  removeRegistryCoverPhoto,
} from "./action";
import { toast } from "sonner";

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
  const { registry, event } = props;
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

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      {/* <p className="capitalize">
        {profile?.role} Dashboard {profile?.firstname}
      </p> */}
      <main className="flex flex-col space-y-16 w-full">
        <div className="w-full bg-[#E9E9ED] border border-[#D4D4D4] rounded-md py-8 h-[250px] flex items-center justify-center">
          {/* Persistent, hidden form to submit the server action with the real File */}
          <form
            id="saveCoverPhotoForm"
            action={saveFormAction}
            className="hidden"
          >
            <input
              type="hidden"
              name="registry_id"
              value={registry.id}
              readOnly
            />
            <input type="hidden" name="event_id" value={event.id} readOnly />
            <input
              id="cover_photo_file"
              name="cover_photo"
              hidden
              accept="image/*"
              type="file"
              onChange={handleImageChange}
            />
          </form>
          <div className="flex items-center flex-col justify-center w-full overflow-hidden h-[250px]">
            {cover_photoInput ? (
              <div className="w-full h-full relative overflow-hidden">
                <Image
                  alt={registry?.title || "Cover photo"}
                  src={cover_photoInput}
                  priority
                  className="object-cover rounded-md"
                  fill
                  sizes="100vw"
                />
                {/* Action buttons overlay */}
                {cover_photoInput && (
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-4 rounded-md backdrop-blur-sm">
                    <label
                      htmlFor="cover_photo_file"
                      className="text-white cursor-pointer text-xs/tight bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-2xl px-4 py-2 flex items-center"
                    >
                      Update Cover Photo
                    </label>
                    {!isImageSaved && selectedFile && (
                      <button
                        type="submit"
                        form="saveCoverPhotoForm"
                        disabled={isSavePending}
                        className="text-white cursor-pointer text-xs/tight bg-green-600 border border-green-600 hover:bg-white hover:text-green-600 rounded-2xl px-4 py-2 flex items-center disabled:opacity-50"
                      >
                        {isSavePending ? "Saving..." : "Save Photo"}
                      </button>
                    )}
                    {isImageSaved && cover_photo ? (
                      <form action={removeFormAction}>
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
                          className="text-white cursor-pointer text-xs/tight bg-red-600 border border-red-600 hover:bg-white hover:text-red-600 rounded-2xl px-4 py-2 flex items-center disabled:opacity-50"
                        >
                          {isRemovePending ? "Removing..." : "Remove Photo"}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isRemovePending}
                        className="text-white cursor-pointer text-xs/tight bg-red-600 border border-red-600 hover:bg-white hover:text-red-600 rounded-2xl px-4 py-2 flex items-center disabled:opacity-50"
                      >
                        {isRemovePending ? "Removing..." : "Remove Photo"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col space-y-8 items-center justify-center">
                <PiFileImageLight className="size-14" />
                <div className="flex flex-col space-y-4">
                  <label
                    htmlFor="cover_photo_file"
                    className="text-white cursor-pointer text-xs/tight bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-2xl px-4 py-2 flex items-center"
                  >
                    Add a Cover Photo
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full flex flex-col space-y-4">
          <p className="text-[#394B71] font-semibold">Registry Summary</p>
          <div className="w-full flex space-x-4 flex-wrap">
            <div className="w-[250px] flex flex-col space-y-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <p className="text-xs text-[#394B71]">Event Name</p>
              <p className="text-sm text-[#247ACB] font-semibold line-clamp-1 w-full">
                {registry.title}
              </p>
              <p className="text-xs text-[#B3B3B3]">
                {format(event.date, "MMMM dd, yyyy")}
              </p>
            </div>
            <div className="flex items-start justify-center space-x-2 border border-[#DCDCDE] rounded-md p-4 bg-white">
              <PiGiftDuotone className="size-18 text-[#247ACB]" />
              <div className="flex flex-col space-y-2">
                <p className="text-4xl text-[#247ACA] font-semibold">0</p>
                <p className="text-xs text-[#939393]">items</p>
              </div>
            </div>
            <ShareRegistryDialog event={event} />
          </div>
        </div>

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

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}
