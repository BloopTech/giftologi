"use client";
import React, { useState, useEffect, useActionState, useMemo } from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
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
import {
  ShoppingCart,
  X,
  Star,
  Heart,
  Palette,
  Ruler,
  StickyNote,
  AlertTriangle,
  BarChart3,
  Eye,
  TrendingUp,
} from "lucide-react";
import { ProgressBar } from "../../../../components/ProgressBar";
import {
  saveRegistryCoverPhoto,
  removeRegistryCoverPhoto,
  updateWelcomeNote,
  updateDeliveryAddress,
  updateRegistryDetails,
  deleteRegistry,
  sendRegistryInvites,
  sendRegistryThankYou,
  updateRegistryPriceRange,
} from "./action";
import EditRegistryItemDialog from "./EditRegistryItemDialog";
import { toast } from "sonner";
import { useHostRegistryCodeContext } from "./context";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../../../components/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/Select";
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
    registryInvites,
    thankYouNotes,
    registryOrders,
    pageViews,
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
  const [inviteState, inviteFormAction, isInvitePending] = useActionState(
    sendRegistryInvites,
    initialState,
  );
  const [thankYouState, thankYouFormAction, isThankYouPending] = useActionState(
    sendRegistryThankYou,
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [thankYouRecipientEmail, setThankYouRecipientEmail] = useState("");
  const [thankYouRecipientName, setThankYouRecipientName] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [showThankYouSuggestions, setShowThankYouSuggestions] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [priceRangeState, priceRangeAction, isPriceRangePending] =
    useActionState(updateRegistryPriceRange, initialState);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
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
    setPriceMin(registry?.price_range_min != null ? String(registry.price_range_min) : "");
    setPriceMax(registry?.price_range_max != null ? String(registry.price_range_max) : "");
  }, [registry?.price_range_min, registry?.price_range_max]);

  useEffect(() => {
    if (priceRangeState?.message && Object.keys(priceRangeState?.errors || {}).length > 0) {
      toast.error(priceRangeState.message);
    }
    if (priceRangeState?.status_code === 200) {
      toast.success(priceRangeState.message);
      refresh?.();
    }
  }, [priceRangeState, refresh]);

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
    if (inviteState?.message && Object.keys(inviteState?.errors || {}).length > 0) {
      toast.error(inviteState?.message);
    }

    if (inviteState?.message && inviteState?.status_code === 200) {
      toast.success(inviteState?.message);
      setInviteEmails("");
      setInviteMessage("");
      setInviteOpen(false);
      refresh?.();
    }
  }, [inviteState, refresh]);

  useEffect(() => {
    if (
      thankYouState?.message &&
      Object.keys(thankYouState?.errors || {}).length > 0
    ) {
      toast.error(thankYouState?.message);
    }

    if (thankYouState?.message && thankYouState?.status_code === 200) {
      toast.success(thankYouState?.message);
      setSelectedOrderId("");
      setThankYouRecipientEmail("");
      setThankYouRecipientName("");
      setThankYouMessage("");
      setShowThankYouSuggestions(false);
      setThankYouOpen(false);
      refresh?.();
    }
  }, [thankYouState, refresh]);

  useEffect(() => {
    if (!deleteOpen) {
      setDeleteConfirmText("");
    }
  }, [deleteOpen]);

  useEffect(() => {
    if (!selectedOrderId) return;
    const orders = Array.isArray(registryOrders) ? registryOrders : [];
    const order = orders.find((item) => item?.id === selectedOrderId);
    if (!order) return;

    const fallbackName = order.gifterAnonymous ? "Anonymous Gifter" : "";
    setThankYouRecipientEmail(order.gifterEmail || order.buyerEmail || "");
    setThankYouRecipientName(
      order.gifterName || order.buyerName || fallbackName || ""
    );
    setShowThankYouSuggestions(false);
  }, [selectedOrderId, registryOrders]);

  const handleSelectThankYouRecipient = (recipient) => {
    if (!recipient?.email) return;
    setThankYouRecipientEmail(recipient.email);
    setThankYouRecipientName(recipient.name || "");
    if (recipient.orderId) {
      setSelectedOrderId(recipient.orderId);
    } else {
      setSelectedOrderId("");
    }
    setShowThankYouSuggestions(false);
  };

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
          productId: product.id,
          title: product.name || "Gift item",
          image: images[0] || "/host/toaster.png",
          price,
          desired: item?.quantity_needed ?? 0,
          purchased: item?.purchased_qty ?? 0,
          priority: item?.priority || null,
          notes: item?.notes || null,
          color: item?.color || null,
          size: item?.size || null,
          _raw: item,
        };
      })
    : [];

  // Duplicate gift detection: flag products appearing more than once by productId
  const duplicateProductIds = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (p.productId) counts[p.productId] = (counts[p.productId] || 0) + 1;
    });
    return new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([id]) => id)
    );
  }, [products]);

  // Analytics computations
  const analytics = useMemo(() => {
    const items = Array.isArray(registryItems) ? registryItems : [];
    const totalDesired = items.reduce((s, i) => s + (i?.quantity_needed ?? 0), 0);
    const totalPurchased = items.reduce((s, i) => s + (i?.purchased_qty ?? 0), 0);
    const completionRate =
      totalDesired > 0 ? Math.round((totalPurchased / totalDesired) * 100) : 0;

    // Most wanted: items with highest desired qty that aren't fully purchased
    const mostWanted = [...items]
      .filter((i) => (i?.quantity_needed ?? 0) > (i?.purchased_qty ?? 0))
      .sort((a, b) => (b?.quantity_needed ?? 0) - (a?.quantity_needed ?? 0))
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        name: i?.product?.name || "Item",
        desired: i?.quantity_needed ?? 0,
        purchased: i?.purchased_qty ?? 0,
        remaining: (i?.quantity_needed ?? 0) - (i?.purchased_qty ?? 0),
      }));

    // Views over time: group page views by date
    const viewsByDate = {};
    (Array.isArray(pageViews) ? pageViews : []).forEach((v) => {
      const date = v.viewed_at ? v.viewed_at.slice(0, 10) : null;
      if (date) viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });
    const viewsTimeline = Object.entries(viewsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const totalViews = (Array.isArray(pageViews) ? pageViews : []).length;

    return { completionRate, mostWanted, viewsTimeline, totalViews };
  }, [registryItems, pageViews]);

  const itemsCount = totals?.itemsCount ?? products.length;
  const desiredQty =
    totals?.desiredQty ?? products.reduce((s, p) => s + (p.desired ?? 0), 0);
  const purchasedQty =
    totals?.purchasedQty ??
    products.reduce((s, p) => s + (p.purchased ?? 0), 0);
  const inviteErrors = inviteState?.errors?.emails || [];
  const thankYouEmailErrors = thankYouState?.errors?.recipient_email || [];
  const thankYouMessageErrors = thankYouState?.errors?.message || [];
  const inviteList = Array.isArray(registryInvites) ? registryInvites : [];
  const thankYouList = Array.isArray(thankYouNotes) ? thankYouNotes : [];
  const ordersList = Array.isArray(registryOrders) ? registryOrders : [];
  const eligibleOrders = useMemo(
    () =>
      ordersList.filter((order) =>
        ["paid", "completed", "processing"].includes(
          String(order?.status || "").toLowerCase()
        )
      ),
    [ordersList]
  );
  const thankYouRecipients = useMemo(() => {
    const seen = new Set();
    const recipients = [];
    eligibleOrders.forEach((order) => {
      const email = order?.gifterEmail || order?.buyerEmail;
      if (!email || seen.has(email)) return;
      const name =
        order?.gifterName ||
        order?.buyerName ||
        (order?.gifterAnonymous ? "Anonymous Gifter" : "");
      recipients.push({
        email,
        name,
        orderId: order?.id || "",
        label: `${email}${name ? ` · ${name}` : ""}`,
      });
      seen.add(email);
    });
    return recipients;
  }, [eligibleOrders]);
  const filteredThankYouRecipients = useMemo(() => {
    const query = (thankYouRecipientEmail || "").trim().toLowerCase();
    const matches = query
      ? thankYouRecipients.filter((recipient) =>
          `${recipient.email} ${recipient.name || ""}`
            .toLowerCase()
            .includes(query)
        )
      : thankYouRecipients;
    return matches.slice(0, 5);
  }, [thankYouRecipientEmail, thankYouRecipients]);
  const hasSelectedPurchase = Boolean(selectedOrderId);

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-6xl w-full font-brasley-medium min-h-screen">
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
              <div className="absolute top-4 right-4 z-1 flex items-center gap-2">
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
              <div className="absolute inset-0 bg-linear-to-r from-black/30 to-transparent" />
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

        <div className="w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[#394B71] font-semibold">
                Invitations & Thank-you notes
              </p>
              <p className="text-xs text-[#6B7280]">
                Manage outreach and gratitude messages from quick dialogs.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-[#394B71] font-semibold">Registry Invitations</p>
                <p className="text-xs text-[#6B7280]">
                  Send multiple invites with a personal message.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {inviteList.length} invite{inviteList.length === 1 ? "" : "s"} sent
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Share your registry with friends and family.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="cursor-pointer px-4 py-2 text-xs font-medium text-white bg-[#5CAE2D] border border-[#5CAE2D] rounded-full hover:bg-white hover:text-[#5CAE2D] transition-colors"
                >
                  New invite
                </button>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Recent invitations
                </p>
                {inviteList.length ? (
                  <div className="mt-3 space-y-2">
                    {inviteList.slice(0, 3).map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-[#111827]">{invite.email}</p>
                          <p className="text-xs text-[#6B7280]">
                            {invite.invited_at
                              ? format(new Date(invite.invited_at), "MMM d, yyyy")
                              : ""}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[#5CAE2D]">
                          {invite.status || "sent"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#9CA3AF]">
                    No invitations yet.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-[#394B71] font-semibold">Thank-you Notes</p>
                <p className="text-xs text-[#6B7280]">
                  Pick a gifter and send a warm thank-you note.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {thankYouList.length} note{thankYouList.length === 1 ? "" : "s"} sent
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Choose a purchase or search for an email.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setThankYouOpen(true)}
                  className="cursor-pointer px-4 py-2 text-xs font-medium text-white bg-[#247ACB] border border-[#247ACB] rounded-full hover:bg-white hover:text-[#247ACB] transition-colors"
                >
                  New thank-you
                </button>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Recent thank-you notes
                </p>
                {thankYouList.length ? (
                  <div className="mt-3 space-y-2">
                    {thankYouList.slice(0, 3).map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-[#111827]">
                            {note.recipient_name || note.recipient_email || "Recipient"}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {note.sent_at
                              ? format(new Date(note.sent_at), "MMM d, yyyy")
                              : "Draft"}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[#247ACB]">
                          Sent
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#9CA3AF]">
                    No thank-you notes yet.
                  </p>
                )}
              </div>
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
                const isDuplicate = duplicateProductIds.has(p.productId);
                const hasSpecs = p.color || p.size || p.notes;
                return (
                  <div
                    key={p.id}
                    className="group flex bg-white rounded-lg flex-col w-[220px] overflow-hidden border border-gray-200 relative"
                  >
                    {/* Priority badge */}
                    {p.priority && (
                      <span
                        className={`absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.priority === "must-have"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                        }`}
                      >
                        {p.priority === "must-have" ? (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3" /> Must-have
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <Heart className="w-3 h-3" /> Nice-to-have
                          </span>
                        )}
                      </span>
                    )}

                    {/* Duplicate warning badge */}
                    {isDuplicate && (
                      <span className="absolute top-2 right-2 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200" title="This product appears more than once in your registry">
                        <AlertTriangle className="w-3 h-3 inline" />
                      </span>
                    )}

                    <div className="relative aspect-square overflow-hidden w-full">
                      <ImageWithFallback
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    </div>
                    <div className="flex flex-col space-y-2 w-full pb-3">
                      <p className="text-sm font-semibold text-black line-clamp-2 w-full px-3 pt-2">
                        {p.title}
                      </p>

                      {/* Specs row */}
                      {hasSpecs && (
                        <div className="flex flex-wrap gap-1.5 px-3">
                          {p.color && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                              <Palette className="w-2.5 h-2.5" /> {p.color}
                            </span>
                          )}
                          {p.size && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded-full border border-teal-100">
                              <Ruler className="w-2.5 h-2.5" /> {p.size}
                            </span>
                          )}
                          {p.notes && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100" title={p.notes}>
                              <StickyNote className="w-2.5 h-2.5" /> Note
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center w-full justify-between px-3">
                        <p className="text-xs text-[#939393]">
                          Desired {p.desired}
                        </p>
                        <p className="text-xs text-[#939393]">
                          Purchased {p.purchased}
                        </p>
                      </div>
                      <div className="flex items-center w-full justify-between pl-3">
                        <p className="text-xs text-[#939393]">{p.price}</p>
                        {isPurchased ? (
                          <p className="text-xs text-white bg-[#8DC76C] border border-[#8DC76C] rounded-l-xl px-2 py-1 flex items-center">
                            Purchased
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditItem(p._raw);
                              setEditItemOpen(true);
                            }}
                            className="text-xs text-white cursor-pointer bg-[#247ACB] border border-[#247ACB] hover:bg-white hover:text-[#247ACB] rounded-l-xl px-2 py-1 flex items-center gap-1"
                          >
                            <PiPencilSimple className="w-3 h-3" /> Edit
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

        {/* Registry Analytics */}
        {itemsCount > 0 && (
          <div className="w-full space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#394B71]" />
              <p className="text-[#394B71] font-semibold">Registry Analytics</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Completion Rate */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#247ACB]" />
                  <p className="text-sm font-medium text-[#394B71]">Completion Rate</p>
                </div>
                <p className="text-3xl font-bold text-[#247ACB]">
                  {analytics.completionRate}%
                </p>
                <ProgressBar value={purchasedQty} max={desiredQty || 1} />
                <p className="text-xs text-[#6B7280]">
                  {purchasedQty} of {desiredQty} items purchased
                </p>
              </div>

              {/* Page Views */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#247ACB]" />
                  <p className="text-sm font-medium text-[#394B71]">Page Views</p>
                </div>
                <p className="text-3xl font-bold text-[#247ACB]">
                  {analytics.totalViews}
                </p>
                <p className="text-xs text-[#6B7280]">Last 90 days</p>
                {analytics.viewsTimeline.length > 0 && (
                  <div className="flex items-end gap-px h-10 mt-1">
                    {analytics.viewsTimeline.slice(-30).map((v, i) => {
                      const max = Math.max(...analytics.viewsTimeline.slice(-30).map((d) => d.count));
                      const height = max > 0 ? Math.max(4, (v.count / max) * 40) : 4;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-[#247ACB] rounded-t-sm opacity-70"
                          style={{ height: `${height}px` }}
                          title={`${v.date}: ${v.count} views`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Most Wanted */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#247ACB]" />
                  <p className="text-sm font-medium text-[#394B71]">Most Wanted</p>
                </div>
                {analytics.mostWanted.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.mostWanted.map((mw) => (
                      <div key={mw.id} className="flex items-center justify-between">
                        <p className="text-xs text-[#111827] line-clamp-1 flex-1 mr-2">
                          {mw.name}
                        </p>
                        <span className="text-[10px] font-medium text-[#247ACB] bg-blue-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {mw.remaining} left
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9CA3AF]">All items fulfilled!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Price Range Settings */}
        <div className="w-full space-y-4">
          <p className="text-[#394B71] font-semibold">Gift Price Guidance</p>
          <p className="text-xs text-[#6B7280]">
            Set a suggested price range so guests know what to expect.
          </p>
          <form action={priceRangeAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="registry_id" value={registry?.id || ""} />
            <input type="hidden" name="event_id" value={event?.id || ""} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Min (GHS)</label>
              <input
                type="number"
                name="price_range_min"
                min={0}
                step="0.01"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0.00"
                disabled={isPriceRangePending}
                className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Max (GHS)</label>
              <input
                type="number"
                name="price_range_max"
                min={0}
                step="0.01"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="0.00"
                disabled={isPriceRangePending}
                className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isPriceRangePending}
              className="px-5 py-2 text-sm font-medium text-white bg-[#A5914B] border border-[#A5914B] rounded-full hover:bg-white hover:text-[#A5914B] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPriceRangePending ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        <Advertisement />

      </main>
      <Footer />

      <EditRegistryItemDialog
        open={editItemOpen}
        onOpenChange={setEditItemOpen}
        item={editItem}
        registryId={registry?.id}
        eventId={event?.id}
        onSuccess={refresh}
      />

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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="w-full max-w-xl rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
            Send registry invitations
          </DialogTitle>
          <p className="text-sm text-gray-500 mb-4">
            Invite friends and family with a short note.
          </p>

          <form action={inviteFormAction} className="space-y-4">
            <input type="hidden" name="registry_id" value={registry?.id || ""} readOnly />
            <input type="hidden" name="event_id" value={event?.id || ""} readOnly />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Email addresses
              </label>
              <textarea
                name="emails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={4}
                placeholder="Enter emails separated by commas or new lines"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                disabled={isInvitePending}
              />
              {inviteErrors.length ? (
                <ul className="list-disc pl-5 text-xs text-red-600">
                  {inviteErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Personal message (optional)
              </label>
              <textarea
                name="message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
                placeholder="Add a short note to include in the invite"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                disabled={isInvitePending}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={isInvitePending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={isInvitePending}
                className="px-5 py-2 text-sm font-medium text-white bg-[#5CAE2D] border border-[#5CAE2D] rounded-full hover:bg-white hover:text-[#5CAE2D] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isInvitePending ? "Sending..." : "Send invites"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={thankYouOpen} onOpenChange={setThankYouOpen}>
        <DialogContent className="w-full max-w-2xl rounded-2xl shadow-xl p-6">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
            Send a thank-you note
          </DialogTitle>
          <p className="text-sm text-gray-500 mb-4">
            Search for a purchase email or pick a purchase below.
          </p>

          <form action={thankYouFormAction} className="space-y-4">
            <input type="hidden" name="registry_id" value={registry?.id || ""} readOnly />
            <input type="hidden" name="event_id" value={event?.id || ""} readOnly />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Purchase</label>
              <input type="hidden" name="order_id" value={selectedOrderId} />
              <Select
                value={selectedOrderId || ""}
                onValueChange={(value) => setSelectedOrderId(value)}
                disabled={isThankYouPending || eligibleOrders.length === 0}
              >
                <SelectTrigger className="w-full rounded-full py-3 text-sm">
                  <SelectValue
                    placeholder={
                      eligibleOrders.length
                        ? "Select a purchase"
                        : "No successful purchases yet"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {eligibleOrders.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      No successful purchases yet
                    </div>
                  ) : (
                    eligibleOrders.map((order) => {
                      const nameLabel =
                        order.gifterName ||
                        order.buyerName ||
                        (order.gifterAnonymous ? "Anonymous Gifter" : "Guest");
                      const dateLabel = order.createdAt
                        ? format(new Date(order.createdAt), "MMM d, yyyy")
                        : "";
                      return (
                        <SelectItem key={order.id} value={order.id}>
                          {`Order ${order.id.slice(0, 6)} · ${nameLabel} ${dateLabel ? `· ${dateLabel}` : ""}`}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-900">
                  Recipient email
                </label>
                <input
                  type="email"
                  name="recipient_email"
                  value={thankYouRecipientEmail}
                  readOnly
                  placeholder={
                    hasSelectedPurchase
                      ? "Recipient email"
                      : "Select a purchase to load the recipient"
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                  disabled={isThankYouPending}
                />
                {thankYouEmailErrors.length ? (
                  <ul className="list-disc pl-5 text-xs text-red-600">
                    {thankYouEmailErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <FormInput
                label="Recipient name"
                name="recipient_name"
                placeholder="Full name"
                optional
                value={thankYouRecipientName}
                onChange={(e) => setThankYouRecipientName(e.target.value)}
                disabled={isThankYouPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Thank-you message
              </label>
              <textarea
                name="message"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                rows={4}
                placeholder="Write your thank-you note"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition hover:border-gray-400"
                disabled={isThankYouPending}
              />
              {thankYouMessageErrors.length ? (
                <ul className="list-disc pl-5 text-xs text-red-600">
                  {thankYouMessageErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={isThankYouPending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={isThankYouPending || !hasSelectedPurchase}
                className="px-5 py-2 text-sm font-medium text-white bg-[#247ACB] border border-[#247ACB] rounded-full hover:bg-white hover:text-[#247ACB] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isThankYouPending ? "Sending..." : "Send thank-you"}
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
