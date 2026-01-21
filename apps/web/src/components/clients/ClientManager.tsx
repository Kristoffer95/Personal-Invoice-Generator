"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClientProfiles, useClientMutations } from "@/hooks/use-client-profiles";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface ClientFormData {
  name: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  notes: string;
}

const emptyFormData: ClientFormData = {
  name: "",
  companyName: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  email: "",
  phone: "",
  website: "",
  taxId: "",
  notes: "",
};

export function ClientManager() {
  const { toast } = useToast();
  const { clients, isLoading } = useClientProfiles();
  const { createClient, updateClient, deleteClient } = useClientMutations();

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Id<"clientProfiles"> | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Id<"clientProfiles"> | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Filter clients by search query
  const filteredClients = clients.filter((client) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.companyName?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
    );
  });

  const handleOpenDialog = (clientId?: Id<"clientProfiles">) => {
    if (clientId) {
      const client = clients.find((c) => c._id === clientId);
      if (client) {
        setEditingClient(clientId);
        setFormData({
          name: client.name,
          companyName: client.companyName ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          state: client.state ?? "",
          postalCode: client.postalCode ?? "",
          country: client.country ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          website: client.website ?? "",
          taxId: client.taxId ?? "",
          notes: client.notes ?? "",
        });
      }
    } else {
      setEditingClient(null);
      setFormData(emptyFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setFormData(emptyFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a client name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingClient) {
        await updateClient({
          clientId: editingClient,
          name: formData.name,
          companyName: formData.companyName || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          website: formData.website || undefined,
          taxId: formData.taxId || undefined,
          notes: formData.notes || undefined,
        });
        toast({ title: "Client updated" });
      } else {
        await createClient({
          name: formData.name,
          companyName: formData.companyName || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          website: formData.website || undefined,
          taxId: formData.taxId || undefined,
          notes: formData.notes || undefined,
        });
        toast({ title: "Client created" });
      }
      handleCloseDialog();
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${editingClient ? "update" : "create"} client`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;

    try {
      await deleteClient({ clientId: clientToDelete });
      toast({ title: "Client deleted" });
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const updateFormField = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client profiles for easy invoice creation
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No clients match your search" : "No clients yet"}
            </p>
            {!searchQuery && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {client.companyName ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      {client.companyName && (
                        <CardDescription className="text-sm">
                          {client.companyName}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(client._id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setClientToDelete(client._id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="truncate">{client.website}</span>
                    </div>
                  )}
                  {(client.city || client.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {[client.city, client.state, client.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                {client.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground line-clamp-2">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Update the client's information"
                : "Enter the client's details to create a new profile"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Contact name"
                  value={formData.name}
                  onChange={(e) => updateFormField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Company or business name"
                  value={formData.companyName}
                  onChange={(e) => updateFormField("companyName", e.target.value)}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={formData.email}
                  onChange={(e) => updateFormField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateFormField("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.example.com"
                value={formData.website}
                onChange={(e) => updateFormField("website", e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={(e) => updateFormField("address", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => updateFormField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => updateFormField("state", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="10001"
                  value={formData.postalCode}
                  onChange={(e) => updateFormField("postalCode", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="United States"
                  value={formData.country}
                  onChange={(e) => updateFormField("country", e.target.value)}
                />
              </div>
            </div>

            {/* Business Info */}
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / VAT Number</Label>
              <Input
                id="taxId"
                placeholder="XX-XXXXXXX"
                value={formData.taxId}
                onChange={(e) => updateFormField("taxId", e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes about this client (not shown on invoices)"
                value={formData.notes}
                onChange={(e) => updateFormField("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingClient ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
            <DialogDescription>
              This will permanently delete this client profile. Invoices using this client will not
              be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setClientToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
