"use client";
import FormInput from "../FormInput";
import FormSelect from "../FormSelect";
import FormDatePicker from "../FormDatePicker";
import FormTextarea from "../FormTextarea";
import { CalendarDays } from "lucide-react";

const eventTypeOptions = [
  { value: "Wedding", label: "Wedding" },
  { value: "Birthday", label: "Birthday" },
  { value: "Baby Shower", label: "Baby Shower" },
  { value: "Fundraiser", label: "Fundraiser" },
  { value: "Custom", label: "Custom" },
];

export default function EventDetailsStep({
  formData,
  updateFormData,
  errors = {},
  disabled = false,
}) {
  return (
    <div className="space-y-5">
      <FormInput
        label="Give your Registry a name"
        name="title"
        placeholder="Harry's Birthday"
        value={formData.title || ""}
        onChange={(e) => updateFormData("title", e.target.value)}
        error={errors.title}
        disabled={disabled}
        required
      />

      <FormSelect
        label="Event Type"
        name="type"
        placeholder="Wedding"
        value={formData.type || ""}
        onValueChange={(value) => updateFormData("type", value)}
        options={eventTypeOptions}
        error={errors.type}
        disabled={disabled}
        required
      />

      <FormDatePicker
        label="Date"
        name="date"
        placeholder="DD/MM/YYYY"
        value={formData.date}
        onChange={(date) => updateFormData("date", date)}
        error={errors.date}
        disabled={disabled}
        required
      />

      <FormInput
        label="Location"
        name="location"
        placeholder="DD/MM/YYYY"
        value={formData.location || ""}
        onChange={(e) => updateFormData("location", e.target.value)}
        error={errors.location}
        disabled={disabled}
        optional
        icon={<CalendarDays className="w-5 h-5" />}
      />

      <FormTextarea
        label="Event Description"
        name="description"
        placeholder="Add a description for your event"
        value={formData.description || ""}
        onChange={(e) => updateFormData("description", e.target.value)}
        error={errors.description}
        disabled={disabled}
        optional
        rows={4}
      />
    </div>
  );
}
