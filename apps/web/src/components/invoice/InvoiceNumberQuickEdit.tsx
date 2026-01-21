"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useInvoiceMutations } from "@/hooks/use-invoices";
import { useToast } from "@/hooks/use-toast";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface InvoiceNumberQuickEditProps {
  invoiceId: Id<"invoices">;
  currentNumber: string;
  onUpdated?: () => void;
}

// Invoice number validation - allow alphanumeric, hyphens, underscores
const INVOICE_NUMBER_PATTERN = /^[a-zA-Z0-9\-_]+$/;
const MAX_INVOICE_NUMBER_LENGTH = 50;

export function InvoiceNumberQuickEdit({
  invoiceId,
  currentNumber,
  onUpdated,
}: InvoiceNumberQuickEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(currentNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateInvoice } = useInvoiceMutations();
  const { toast } = useToast();

  // Reset value when popover opens
  useEffect(() => {
    if (isOpen) {
      setValue(currentNumber);
      setError(null);
      // Focus input after a brief delay to allow popover to render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, currentNumber]);

  const validateInvoiceNumber = useCallback((num: string): string | null => {
    const trimmed = num.trim();

    if (!trimmed) {
      return "Invoice number is required";
    }

    if (trimmed.length > MAX_INVOICE_NUMBER_LENGTH) {
      return `Invoice number must be ${MAX_INVOICE_NUMBER_LENGTH} characters or less`;
    }

    if (!INVOICE_NUMBER_PATTERN.test(trimmed)) {
      return "Invoice number can only contain letters, numbers, hyphens, and underscores";
    }

    return null;
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedValue = value.trim();

    // Validate input
    const validationError = validateInvoiceNumber(trimmedValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Skip if unchanged
    if (trimmedValue === currentNumber) {
      setIsOpen(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateInvoice({
        invoiceId,
        invoiceNumber: trimmedValue,
      });

      toast({
        title: "Invoice number updated",
        description: `Changed to ${trimmedValue}`,
      });

      setIsOpen(false);
      onUpdated?.();
    } catch (err) {
      // Sanitize error message to avoid leaking implementation details
      let userMessage = "Failed to update invoice number";

      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes("already exists")) {
          userMessage = "This invoice number is already in use. Please choose another.";
        } else if (errorMsg.includes("is required") || errorMsg.includes("must be")) {
          // Pass through validation messages
          userMessage = err.message;
        } else if (errorMsg.includes("unauthorized")) {
          userMessage = "You don't have permission to update this invoice.";
        }
        // Log full error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error("Invoice update error:", err);
        }
      }

      setError(userMessage);
      toast({
        title: "Update failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [value, currentNumber, invoiceId, updateInvoice, toast, onUpdated, validateInvoiceNumber]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, [handleSubmit, isSubmitting]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    // Clear error when user starts typing
    setError((prevError) => (prevError ? null : prevError));
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="inline-flex items-center justify-center h-6 px-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          title="Edit invoice number"
        >
          <Pencil className="h-3 w-3" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Invoice Number</label>
          <div className="flex gap-1.5">
            <Input
              ref={inputRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g., INV-001"
              className={`h-8 text-sm ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              disabled={isSubmitting}
              maxLength={MAX_INVOICE_NUMBER_LENGTH}
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleSubmit}
              disabled={isSubmitting}
              title="Save"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              title="Cancel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
