"use client";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import Image from "next/image";

function PhotoUploadCard({ label, name, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onChange(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      className="relative flex flex-col items-center justify-center p-6 bg-[#FFFCF3] border border-[#A5914B] border-dashed rounded-2xl cursor-pointer hover:bg-[#FFF9E6] transition-colors min-h-[180px]"
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      
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
  errors = {},
  disabled = false,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <PhotoUploadCard
          label="Upload Event Photo"
          name="eventPhoto"
          value={formData.eventPhoto}
          onChange={(file) => updateFormData("eventPhoto", file)}
          disabled={disabled}
        />
        <PhotoUploadCard
          label="Upload Cover Photo"
          name="coverPhoto"
          value={formData.coverPhoto}
          onChange={(file) => updateFormData("coverPhoto", file)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
