"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  DollarSign,
  Tag,
  Archive,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = [
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

  return (
    <div className="space-y-3">
      {/* Search and Quick Actions Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tags Filter Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Tag className="h-4 w-4" />
              Tags
              {filters.tags.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {filters.tags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filter by Tags</span>
                {filters.tags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateFilter("tags", [])}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <TagSelector
                selectedTags={filters.tags}
                onChange={(tags) => updateFilter("tags", tags)}
                type="invoice"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* More Filters Toggle */}
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          More
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Show Archived Toggle */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="show-archived" className="text-sm cursor-pointer">
            Archived
          </Label>
          <Switch
            id="show-archived"
            checked={filters.showArchived}
            onCheckedChange={(checked) => updateFilter("showArchived", checked)}
          />
        </div>

        {/* Clear All Button */}
        {(activeFilterCount > 0 || filters.searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Status Pills (Multi-Select) - Always visible for multi-selection */}
      {!showAdvanced && (
        <div className="flex flex-wrap gap-1">
          {ALL_STATUSES.map((status) => {
            const isSelected = filters.statuses.includes(status);
            const colors = INVOICE_STATUS_COLORS[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`
                  px-2 py-0.5 rounded text-xs font-medium transition-all
                  ${colors.bg} ${colors.text}
                  ${isSelected
                    ? "opacity-100 ring-2 ring-primary ring-offset-1"
                    : "opacity-50 hover:opacity-75"
                  }
                `}
              >
                {INVOICE_STATUS_LABELS[status]}
              </button>
            );
          })}
          {filters.statuses.length > 0 && (
            <button
              type="button"
              onClick={() => updateFilter("statuses", [])}
              className="px-2 py-0.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg border bg-muted/30">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Date From
            </Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Date To
            </Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Min Amount
            </Label>
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Max Amount
            </Label>
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
