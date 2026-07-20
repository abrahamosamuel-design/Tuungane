import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { categories as staticCategories } from "@/data/categories";
import { useCategories } from "@/hooks/use-categories";
import {
  budgetBuckets,
  contactMethods,
  urgencyOptions,
  visibilityOptions,
  type ContactMethodValue,
  type UrgencyValue,
  type VisibilityValue,
} from "@/data/serviceRequestTypes";
import { MediaUploader } from "@/components/feed/MediaUploader";
import { toast } from "sonner";
import { toastError } from "@/lib/user-errors";
import { Loader2, MapPin, ShieldAlert, Sparkles, ArrowRight, Pencil, ChevronDown } from "lucide-react";
import { REQUESTS_SAFETY_TEXT } from "@/data/requestTypes";
import { useUserLocation } from "@/hooks/use-user-location";
import { AreaAutocomplete } from "@/components/AreaAutocomplete";
import { MapPicker } from "@/components/MapPicker";
import { findDistrictBounds, type Bounds } from "@/lib/geocoding";

import { PostAsSelector } from "@/components/PostAsSelector";
import { usePostAsOptions, findOption } from "@/hooks/use-post-as-options";



const s = (v: unknown) => (typeof v === "string" ? v : "");

export const Route = createFileRoute("/_authenticated/requests/new")({
  validateSearch: (search: Record<string, unknown>): any => ({
    providerId: s(search.providerId),
    profileId: s(search.profileId),
    serviceId: s(search.serviceId),
    // Prefill (used by "Request again")
    category: s(search.category),
    subcategory: s(search.subcategory),
    title: s(search.title),
    location: s(search.location),
    district: s(search.district),
    town: s(search.town),
    area: s(search.area),
  }),
  head: () => ({ meta: [{ title: "Post a Service Request — Tuungane" }] }),
  component: NewRequest,
});

import { Navigate } from "@tanstack/react-router";

function NewRequest() {
  return <Navigate to="/" replace />;
}
