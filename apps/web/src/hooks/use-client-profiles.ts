"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export function useClientProfiles() {
  const clients = useQuery(api.clientProfiles.listClients);

  return {
    clients: clients ?? [],
    isLoading: clients === undefined,
  };
}

export function useClientProfile(clientId: Id<"clientProfiles"> | undefined) {
  const client = useQuery(
    api.clientProfiles.getClient,
    clientId ? { clientId } : "skip"
  );

  return {
    client: client ?? null,
    isLoading: client === undefined,
  };
}

export function useClientSearch(query: string) {
  const clients = useQuery(
    api.clientProfiles.searchClients,
    query ? { query } : "skip"
  );

  return {
    clients: clients ?? [],
    isLoading: clients === undefined,
  };
}

export function useClientMutations() {
  const createClient = useMutation(api.clientProfiles.createClient);
  const updateClient = useMutation(api.clientProfiles.updateClient);
  const deleteClient = useMutation(api.clientProfiles.removeClient);
  const upsertFromInvoice = useMutation(api.clientProfiles.upsertFromInvoice);

  return {
    createClient,
    updateClient,
    deleteClient,
    upsertFromInvoice,
  };
}
