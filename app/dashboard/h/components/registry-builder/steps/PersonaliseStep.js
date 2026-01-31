"use client";
import { useCallback } from "react";
import { Upload, X } from "lucide-react";
import Image from "next/image";

function PhotoUploadCard({ label, inputId, preview, onRemove, disabled }) {
  const handleRemove = useCallback(
    (e) => {
      e.stopPropagation();
      const input = document.getElementById(inputId);
      if (input) {
        input.value = "";
      }
      onRemove?.();
    },
    [inputId, onRemove]
  );

  return (
    <div
      onClick={() => {
        if (disabled) return;
        const input = document.getElementById(inputId);
        input?.click?.();
      }}
      className="relative flex flex-col items-center justify-center p-6 bg-[#FFFCF3] border border-[#A5914B] border-dashed rounded-2xl cursor-pointer hover:bg-[#FFF9E6] transition-colors min-h-[180px]"
    >

      {preview ? (
        <div className="relative w-full h-32">
          <Image
            src={preview}
            alt={label}
            fill
            className="object-contain rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="p-3 mb-2">
            <Upload className="w-10 h-10 text-[#A5914B]" strokeWidth={1.5} />
          </div>
          <span className="text-sm text-gray-700 font-medium">{label}</span>
        </>
      )}
    </div>
  );
}

export default function PersonaliseStep({
  formData,
  updateFormData,
  photoPreviews,
  errors = {},
  disabled = false,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <PhotoUploadCard
          label="Upload Event Photo"
          inputId="registry_builder_event_photo"
          preview={photoPreviews?.eventPhoto}
          onRemove={() => updateFormData("eventPhoto", null)}
          disabled={disabled}
        />
        <PhotoUploadCard
          label="Upload Cover Photo"
          inputId="registry_builder_cover_photo"
          preview={photoPreviews?.coverPhoto}
          onRemove={() => updateFormData("coverPhoto", null)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
