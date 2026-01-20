"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";

export function useUserProfile() {
  const data = useQuery(api.userProfiles.getProfile);
  const upsertProfile = useMutation(api.userProfiles.upsert);
  const updateNumbering = useMutation(api.userProfiles.updateInvoiceNumbering);

  return {
    data,
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    isLoading: data === undefined,
    upsertProfile,
    updateNumbering,
  };
}

export function useNextInvoiceNumber() {
  const data = useQuery(api.userProfiles.getNextInvoiceNumber);
  const incrementNumber = useMutation(api.userProfiles.incrementInvoiceNumber);

  return {
    ...data,
    isLoading: data === undefined,
    incrementNumber,
  };
}
