"use client";
import React, { useState, useEffect, useActionState } from "react";
import { X } from "lucide-react";
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
import { updateRegistryItem } from "./action";
import { toast } from "sonner";

const initialState = { message: "", errors: {}, values: {}, data: {} };

export default function EditRegistryItemDialog({
  open,
  onOpenChange,
  item,
  registryId,
  eventId,
  onSuccess,
}) {
  const [state, formAction, isPending] = useActionState(
    updateRegistryItem,
    initialState
  );

  const [priority, setPriority] = useState("nice-to-have");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setPriority(item.priority || "nice-to-have");
      setNotes(item.notes || "");
      setColor(item.color || "");
      setSize(item.size || "");
      setQuantity(item.quantity_needed ?? 1);
    }
  }, [item]);

  useEffect(() => {
    if (state?.message && Object.keys(state?.errors || {}).length > 0) {
      toast.error(state.message);
    }
    if (state?.status_code === 200) {
      toast.success(state.message);
      onOpenChange(false);
      onSuccess?.();
    }
  }, [state, onOpenChange, onSuccess]);

  const productName = item?.product?.name || "Item";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-2xl shadow-xl p-6">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogTitle className="text-lg font-semibold text-gray-900 mb-1">
          Edit Item
        </DialogTitle>
        <p className="text-sm text-gray-500 mb-4 line-clamp-1">{productName}</p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="registry_item_id" value={item?.id || ""} />
          <input type="hidden" name="registry_id" value={registryId || ""} />
          <input type="hidden" name="event_id" value={eventId || ""} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Priority</label>
            <input type="hidden" name="priority" value={priority} />
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value)}
              disabled={isPending}
            >
              <SelectTrigger className="w-full rounded-xl py-2.5 text-sm">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="must-have">Must-have</SelectItem>
                <SelectItem value="nice-to-have">Nice-to-have</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Quantity needed
            </label>
            <input
              type="number"
              name="quantity_needed"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              disabled={isPending}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none hover:border-gray-400 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Preferred color
              </label>
              <input
                type="text"
                name="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Blue"
                maxLength={100}
                disabled={isPending}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Preferred size
              </label>
              <input
                type="text"
                name="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. Large"
                maxLength={100}
                disabled={isPending}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Personal notes
            </label>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Prefer the wooden version, not plastic"
              maxLength={500}
              disabled={isPending}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {notes.length}/500
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                disabled={isPending}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-medium text-white bg-primary border border-primary rounded-full hover:bg-white hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
