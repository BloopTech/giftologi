"use client";
import React, { useEffect, useState, useActionState } from "react";
import {
  PiFileImageLight,
  PiGiftDuotone,
  PiShareBold,
  PiDotsThreeVertical,
  PiPencilSimple,
  PiTrash,
} from "react-icons/pi";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import Footer from "../../../components/footer";
import Advertisement from "../../../components/advertisement";
import CarouselHero from "../components/CarouselHero";
import wedding from "../../../../public/host/wedding.png";
import birthday from "../../../../public/host/birthday.png";
import babyshower from "../../../../public/host/babyshower.png";
import fundraiser from "../../../../public/host/fundraiser.png";
import giftbox from "../../../../public/host/lists-gift-box.png";
import Samantha from "../../../../public/host/Samantha.png";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../../components/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/Dropdown";
import VisuallyHidden from "../../../components/accessibility/VisuallyHidden";
import CreateRegistryDialog from "../components/createRegistryDialog";
import RegistryType from "../components/registryType";
import { toast } from "sonner";
import { useHostRegistryListContext } from "./context";
import { deleteRegistry, updateRegistryDetails } from "./[registry_code]/action";
import EditRegistryBuilderDialog from "../components/registry-builder/EditRegistryBuilderDialog";
import FormInput from "../components/registry-builder/FormInput";
import Image from "next/image";

const carouselItems = [
  {
    image: wedding,
    title: "Wedding",
  },
  {
    image: babyshower,
    title: "Baby Shower",
  },
  {
    image: birthday,
    title: "Birthday",
  },
  {
    image: fundraiser,
    title: "Fundraiser",
  },
  {
    image: wedding,
    title: "Custom",
  },
];

export default function HostDashboardRegistryListsContent(props) {
  const {
    registries,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    hasMore,
  } = useHostRegistryListContext() || {};

  const [createRegistryOpen, setCreateRegistryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const initialState = {
    message: "",
    errors: {},
    values: {},
    data: {},
  };

  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteRegistry,
    initialState,
  );

  const openCreateRegistry = () => setCreateRegistryOpen(true);
  const closeCreateRegistry = () => setCreateRegistryOpen(false);

  useEffect(() => {
    if (!deleteOpen) {
      setDeleteConfirmText("");
    }
  }, [deleteOpen]);

  useEffect(() => {
    if (deleteState?.message && Object.keys(deleteState?.errors || {}).length) {
      toast.error(deleteState.message);
    }
    if (deleteState?.message && deleteState?.status_code === 200) {
      toast.success(deleteState.message);
      setDeleteOpen(false);
      setSelectedRegistry(null);
      setDeleteConfirmText("");
      refresh?.();
    }
  }, [deleteState, refresh]);

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-6xl w-full font-brasley-medium min-h-screen">
      <main className="flex flex-col space-y-16 w-full px-5 md:px-10">
        <CarouselHero
          items={carouselItems}
          openCreateRegistry={openCreateRegistry}
        />

        <Dialog open={createRegistryOpen} onOpenChange={setCreateRegistryOpen}>
          <DialogContent className="max-w-2xl">
            <VisuallyHidden>
              <DialogTitle>Create New Registry</DialogTitle>
            </VisuallyHidden>
            <CreateRegistryDialog onClose={closeCreateRegistry} />
          </DialogContent>
        </Dialog>

        <RegistryType openCreateRegistry={openCreateRegistry} />

        <div className="w-full flex flex-col space-y-8">
          <div className="w-full flex flex-col space-y-4">
            <h1 className="text-[#85753C] font-semibold text-lg">Your Lists</h1>
            <p className="text-[#85753C] text-sm">
              Here&apos;s where all your gift registries live.
              <br /> Create new ones, update details, or share them with ease.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-8 items-center">
            {isLoading ? (
              <div className="w-full text-sm text-gray-500">Loading...</div>
            ) : error ? (
              <div className="w-full text-sm text-red-600">
                {error?.message || "Failed to load registries"}
              </div>
            ) : registries?.length ? (
              <div className="w-full grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {registries?.map((row) => {
                  const coverPhoto = row?.cover_photo;
                  const title = row?.title;
                  const registryCode = row?.registry_code;
                  const registryId = row?.id;
                  const event = Array.isArray(row?.event) ? row.event[0] : row?.event;
                  const deliveryAddress = Array.isArray(row?.delivery_address)
                    ? row.delivery_address[0]
                    : row?.delivery_address;
                  return (
                    <div
                      key={registryId}
                      className="flex flex-col rounded-2xl border border-[#DCDCDE] overflow-hidden"
                    >
                      <div className="bg-[#FFFCF3] p-4 w-full flex items-center justify-center relative h-[200px] overflow-hidden">
                        <div className="w-full h-full">
                          <ImageWithFallback
                            src={coverPhoto}
                            alt="gift box"
                            fill
                            priority
                            sizes="230px"
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute top-3 right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="cursor-pointer p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors">
                                <PiDotsThreeVertical className="w-4 h-4 text-[#6B7280]" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12}>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedRegistry({
                                    ...row,
                                    event,
                                    street_address: deliveryAddress?.street_address,
                                    street_address_2: deliveryAddress?.street_address_2,
                                    city: deliveryAddress?.city,
                                    state_province: deliveryAddress?.state_province,
                                    postal_code: deliveryAddress?.postal_code,
                                    gps_location: deliveryAddress?.gps_location,
                                    digital_address: deliveryAddress?.digital_address,
                                  });
                                  setEditOpen(true);
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  <PiPencilSimple className="w-4 h-4" />
                                  Edit registry
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedRegistry({ ...row, event });
                                  setDeleteOpen(true);
                                }}
                              >
                                <span className="flex items-center gap-2 text-red-600">
                                  <PiTrash className="w-4 h-4" />
                                  Delete registry
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/h/registry/${registryCode}`}
                          className="cursor-pointer hover:underline"
                        >
                          <p className="text-sm text-[#A2845E] bg-[#FFFFFF] p-4 w-full h-[70px] line-clamp-2">
                            {title}
                          </p>
                        </Link>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-col gap-4 justify-center items-center">
                  <button
                    type="button"
                    onClick={openCreateRegistry}
                    className="cursor-pointer w-30 h-[200px] flex flex-col space-y-4 items-center rounded-full bg-white px-4 py-6 border border-[#DAC67E] text-[#A5914B]"
                  >
                    <Plus className="size-8" />
                    <span className="w-full flex items-center justify-center relative h-[100px] -my-[1rem]">
                      <span className="w-full h-full">
                        <ImageWithFallback
                          src={giftbox}
                          alt="gift box"
                          fill
                          priority
                          sizes="100px"
                          className="object-contain"
                        />
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openCreateRegistry}
                    className="text-[#A2845E] cursor-pointer text-xs/tight flex items-center justify-center"
                  >
                    Add to Registry
                  </button>
                </div>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => loadMore?.()}
                    disabled={isLoadingMore}
                    className="text-white cursor-pointer text-xs/tight bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-2xl px-4 py-2 flex items-center disabled:opacity-50"
                  >
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-center mx-auto max-w-md w-full rounded-4xl border border-[#A9C4FC] px-4 py-8 bg-white flex-col space-y-4">
                <div className="inline-block">
                  <ImageWithFallback
                    src="/host/giftologi-gift-box.svg"
                    alt="open gift"
                    width={100}
                    height={100}
                    className="object-contain"
                    priority
                  />
                </div>
                <p className="text-[#394B71] font-semibold text-center text-sm">
                  Ready to make your first registry? <br /> Click below to
                  create and share.
                </p>
                <button
                  type="button"
                  onClick={openCreateRegistry}
                  className="text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center"
                >
                  Create Registry
                </button>
              </div>
            )}
          </div>
        </div>

        <Advertisement />

      </main>
      <Footer />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-full max-w-2xl rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>

          <VisuallyHidden>
            <DialogTitle>Edit Registry</DialogTitle>
          </VisuallyHidden>

          <EditRegistryBuilderDialog
            action={updateRegistryDetails}
            registry={selectedRegistry}
            event={selectedRegistry?.event}
            deliveryAddress={selectedRegistry?.delivery_address}
            onClose={() => {
              setEditOpen(false);
              setSelectedRegistry(null);
            }}
            onSuccess={() => {
              setEditOpen(false);
              setSelectedRegistry(null);
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
            This action cannot be undone. Type {" "}
            <span className="font-semibold">DELETE REGISTRY</span> to confirm.
          </p>

          <form action={deleteFormAction} className="space-y-4">
            <input
              type="hidden"
              name="registry_id"
              value={selectedRegistry?.id || ""}
              readOnly
            />
            <input
              type="hidden"
              name="event_id"
              value={selectedRegistry?.event?.id || ""}
              readOnly
            />

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
