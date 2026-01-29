"use client";

import { useState, useMemo } from "react";
import {
  Users,
  FileText,
  Download,
  DollarSign,
  Activity,
  Clock,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "./StatCard";
import { TopUsersTable } from "./TopUsersTable";
import { ActivityFeed } from "./ActivityFeed";
import { useAdminDashboardStats, useAdminActivities, useActivityCounts } from "@/hooks/use-admin";

// Event type filter options
const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "PDF_EXPORT", label: "PDF Exports" },
  { value: "INVOICE_CREATE", label: "Invoices Created" },
  { value: "INVOICE_UPDATE", label: "Invoices Updated" },
  { value: "INVOICE_DELETE", label: "Invoices Deleted" },
  { value: "INVOICE_STATUS_CHANGE", label: "Status Changes" },
  { value: "FOLDER_CREATE", label: "Folders Created" },
  { value: "TEMPLATE_CREATE", label: "Templates Created" },
  { value: "CLIENT_CREATE", label: "Clients Created" },
];

// Date range filter options
const DATE_RANGE_OPTIONS: { value: string; label: string; ms: number | null }[] = [
  { value: "all", label: "All Time", ms: null },
  { value: "today", label: "Today", ms: 24 * 60 * 60 * 1000 },
  { value: "week", label: "This Week", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "month", label: "This Month", ms: 30 * 24 * 60 * 60 * 1000 },
];

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function AdminDashboard() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  const { stats, isLoading: statsLoading } = useAdminDashboardStats();

  // Get date range timestamp for filtering
  const sinceTimestamp = useMemo(() => {
    const range = DATE_RANGE_OPTIONS.find((r) => r.value === dateRangeFilter);
    if (!range || !range.ms) return undefined;
    return Date.now() - range.ms;
  }, [dateRangeFilter]);

  // Fetch activities with filters
  const { activities, isLoading: activitiesLoading } = useAdminActivities({
    eventType: eventTypeFilter !== "all" ? (eventTypeFilter as never) : undefined,
    limit: 20,
  });

  // Fetch activity counts with date filter
  const { counts } = useActivityCounts({
    since: sinceTimestamp,
  });

  // Filter activities by date range on the client side
  const filteredActivities = useMemo(() => {
    if (!sinceTimestamp) return activities;
    return activities.filter((a) => a.timestamp >= sinceTimestamp);
  }, [activities, sinceTimestamp]);

  // Format total revenue
  const formattedRevenue = useMemo(() => {
    if (!stats?.totalRevenue) return "$0";
    const entries = Object.entries(stats.totalRevenue);
    if (entries.length === 0) return "$0";
    if (entries.length === 1) {
      const [currency, amount] = entries[0];
      return formatCurrency(amount, currency);
    }
    // Multiple currencies - show first with count
    const [currency, amount] = entries[0];
    return `${formatCurrency(amount, currency)} (+${entries.length - 1} more)`;
  }, [stats?.totalRevenue]);

  // Calculate total activity count from counts
  const totalActivityCount = useMemo(() => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }, [counts]);

  const isLoading = statsLoading;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={isLoading ? "..." : (stats?.totalUsers ?? 0)}
          description={
            isLoading
              ? undefined
              : `${stats?.activeUsersMonth ?? 0} active this month`
          }
          icon={Users}
        />
        <StatCard
          title="PDF Exports"
          value={isLoading ? "..." : (stats?.totalPdfExports ?? 0)}
          description="Total exports"
          icon={Download}
        />
        <StatCard
          title="Total Invoices"
          value={isLoading ? "..." : (stats?.totalInvoices ?? 0)}
          description="Across all users"
          icon={FileText}
        />
        <StatCard
          title="Platform Revenue"
          value={isLoading ? "..." : formattedRevenue}
          description="From paid invoices"
          icon={DollarSign}
        />
      </div>

      {/* Active Users Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : (stats?.activeUsersToday ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : (stats?.activeUsersWeek ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : (stats?.activeUsersMonth ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown (if multiple currencies) */}
      {stats?.totalRevenue && Object.keys(stats.totalRevenue).length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue by Currency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.totalRevenue).map(([currency, amount]) => (
                <Badge key={currency} variant="secondary" className="text-sm py-1 px-3">
                  {formatCurrency(amount, currency)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Top Users and Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Users */}
        <TopUsersTable
          users={stats?.topUsersByActivity ?? []}
          isLoading={isLoading}
        />

        {/* Activity Feed with Filters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Activity</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={dateRangeFilter}
                onValueChange={setDateRangeFilter}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={eventTypeFilter}
                onValueChange={setEventTypeFilter}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {dateRangeFilter !== "all" && (
              <div className="mb-4 text-sm text-muted-foreground">
                {totalActivityCount} total activities in selected period
              </div>
            )}
            <div className="max-h-[400px] overflow-y-auto">
              <ActivityFeed
                activities={filteredActivities}
                isLoading={activitiesLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
