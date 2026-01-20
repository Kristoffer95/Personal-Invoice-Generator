"use client";

import { useState } from "react";
import { Filter, X, Calendar, DollarSign, Tag, Archive, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";
import { TagSelector } from "@/components/tags/TagSelector";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

const ALL_STATUSES: InvoiceStatus[] = [
  "DRAFT",
  "TO_SEND",
  "SENT",
  "VIEWED",
  "PAYMENT_PENDING",
  "PARTIAL_PAYMENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
];

export interface InvoiceFiltersState {
  searchQuery: string;
  statuses: InvoiceStatus[];
  tags: Id<"tags">[];
  dateFrom: string;
  dateTo: string;
  amountMin: number | undefined;
  amountMax: number | undefined;
  showArchived: boolean;
}

interface InvoiceFiltersProps {
  filters: InvoiceFiltersState;
  onChange: (filters: InvoiceFiltersState) => void;
  onClear: () => void;
}

export const defaultFilters: InvoiceFiltersState = {
  searchQuery: "",
  statuses: [],
  tags: [],
  dateFrom: "",
  dateTo: "",
  amountMin: undefined,
  amountMax: undefined,
  showArchived: false,
};

export function InvoiceFilters({ filters, onChange, onClear }: InvoiceFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.searchQuery,
    filters.statuses.length > 0,
    filters.tags.length > 0,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin !== undefined,
    filters.amountMax !== undefined,
    filters.showArchived,
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof InvoiceFiltersState>(
    key: K,
    value: InvoiceFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleStatus = (status: InvoiceStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    updateFilter("statuses", newStatuses);
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter("searchQuery", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Advanced Filters Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Filter Invoices</SheetTitle>
            <SheetDescription>
              Narrow down your invoice list with advanced filters
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Status Filter */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center">
                  S
                </Badge>
                Status
              </Label>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((status) => {
                  const isSelected = filters.statuses.includes(status);
                  const colors = INVOICE_STATUS_COLORS[status];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatus(status)}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        ${isSelected
                          ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ring-primary`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }
                      `}
                    >
                      {INVOICE_STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags Filter */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <TagSelector
                selectedTags={filters.tags}
                onChange={(tags) => updateFilter("tags", tags)}
                type="invoice"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Amount Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={filters.amountMin ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "amountMin",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={filters.amountMax ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "amountMax",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Archive Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Show Archived</Label>
                  <p className="text-xs text-muted-foreground">
                    Include archived invoices in results
                  </p>
                </div>
              </div>
              <Switch
                checked={filters.showArchived}
                onCheckedChange={(checked) => updateFilter("showArchived", checked)}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={handleClear}>
              Clear All
            </Button>
            <Button onClick={() => setIsOpen(false)}>Apply Filters</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-muted-foreground">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}

// Compact inline filter for quick status filtering
export function InvoiceStatusFilter({
  selectedStatuses,
  onChange,
}: {
  selectedStatuses: InvoiceStatus[];
  onChange: (statuses: InvoiceStatus[]) => void;
}) {
  const toggleStatus = (status: InvoiceStatus) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {ALL_STATUSES.map((status) => {
        const isSelected = selectedStatuses.includes(status);
        const colors = INVOICE_STATUS_COLORS[status];
        return (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatus(status)}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-opacity
              ${colors.bg} ${colors.text}
              ${isSelected ? "opacity-100 ring-1 ring-primary" : "opacity-50 hover:opacity-75"}
            `}
          >
            {INVOICE_STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
