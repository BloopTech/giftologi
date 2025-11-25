"use client";
import React, {
  useActionState,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { Search } from "lucide-react";
import { adminGlobalSearch } from "../action";

const initialState = {
  message: "",
  errors: {
    query: [],
    type: [],
    status: [],
  },
  values: {},
  results: [],
};

export default function SearchEngine() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    adminGlobalSearch,
    initialState
  );
  const [typeValue, setTypeValue] = useState("all");
  const [statusValue, setStatusValue] = useState("all");
  const [open, setOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (state?.values?.type) {
      setTypeValue(state.values.type);
    }
    if (state?.values?.status) {
      setStatusValue(state.values.status || "all");
    }
  }, [state?.values?.type, state?.values?.status]);

  const errors = useMemo(() => state?.errors || {}, [state?.errors]);
  const hasError = useCallback(
    (key) => (errors?.[key]?.length ?? 0) > 0,
    [errors]
  );

  useEffect(() => {
    if (!hasSubmitted) return;
    if (isPending) return;
    if (!hasError("query")) {
      setOpen(true);
    }
  }, [hasSubmitted, isPending, state?.results, state?.message, errors, hasError]);

  const handleResultClick = (result) => {
    if (!result?.navigate?.path) return;

    const searchParams = new URLSearchParams();
    const query = state?.values?.query || "";

    if (query) {
      searchParams.set("q", query);
    }

    const entityType = result.entityType || "vendor";
    searchParams.set("type", entityType);

    if (result.id) {
      searchParams.set("focusId", result.id);
    }

    searchParams.set("page", "1");

    router.push(`${result.navigate.path}?${searchParams.toString()}`);
    setOpen(false);
  };

  return (
    <div className="flex flex-col p-4 border border-[#D6D6D6] rounded-xl bg-white w-full space-y-4">
      <div className="flex flex-col">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
          Universal Search
        </h1>
        <span className="text-[#717182] text-xs/4 font-poppins">
          Get a quick overview of registry and vendor performance at a glance.
        </span>
      </div>
      <form
        action={formAction}
        onSubmit={() => setHasSubmitted(true)}
        className="flex space-x-4 items-center"
      >
        <div className="w-[50%]">
          <input
            type="text"
            name="query"
            defaultValue={state?.values?.query || ""}
            placeholder="Search all users here"
            className={`border border-[#D6D6D6] rounded-full py-3 px-4 text-xs bg-white w-full ${
              hasError("query") ? "border-red-500" : ""
            }`}
          />
        </div>
        <div className="w-[20%]">
          <input type="hidden" name="type" value={typeValue} />
          <Select
            value={typeValue}
            onValueChange={setTypeValue}
            disabled={isPending}
            required
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[20%]">
          <input type="hidden" name="status" value={statusValue} />
          <Select
            value={statusValue}
            onValueChange={setStatusValue}
            disabled={isPending}
            required
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[10%]">
          <button
            type="submit"
            disabled={isPending}
            className="text-[10px] space-x-2 bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full cursor-pointer px-4 py-1 flex items-center justify-center font-poppins font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="size-4" />
            <span>{isPending ? "Searching..." : "Search"}</span>
          </button>
        </div>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Search results
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
            {state?.message && !state.results?.length ? (
              <p className="text-xs text-[#717182]">{state.message}</p>
            ) : null}
            {state?.results?.length ? (
              <ul className="space-y-1">
                {state.results.map((result) => (
                  <li key={`${result.entityType}-${result.id}`}>
                    <button
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full flex flex-col items-start rounded-lg border border-[#D6D6D6] bg-white px-3 py-2 text-left hover:border-[#3979D2] hover:bg-[#F3F6FF] cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-[#0A0A0A]">
                          {result.title}
                        </span>
                        <span className="text-[10px] rounded-full border border-[#D6D6D6] px-2 py-0.5 text-[#717182] capitalize">
                          {result.entityType}
                        </span>
                      </div>
                      {result.subtitle ? (
                        <p className="mt-1 text-[11px] text-[#717182]">
                          {result.subtitle}
                        </p>
                      ) : null}
                      {result.status ? (
                        <p className="mt-1 text-[10px] text-[#3979D2]">
                          {result.status}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

