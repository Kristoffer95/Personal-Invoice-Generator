"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  FileText,
  Users,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGlobalAnalytics,
  useAllFoldersAnalytics,
  useAnalyticsByStatus,
  useAnalyticsByClient,
  useMonthlyAnalytics,
} from "@/hooks/use-analytics";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatHours(hours: number) {
  return `${hours.toFixed(1)}h`;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className={cn(
                  "h-3 w-3",
                  trend.value >= 0 ? "text-green-500" : "text-red-500"
                )} />
                <span className={trend.value >= 0 ? "text-green-500" : "text-red-500"}>
                  {trend.value >= 0 ? "+" : ""}{trend.value}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="p-2 bg-muted rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FolderAnalyticsData {
  folderId: string | null;
  folderName: string | null;
  invoiceCount: number;
  totalAmount: number;
  totalHours: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
}

function FolderAnalyticsCard({ folder }: { folder: FolderAnalyticsData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
          />
          <div className="text-left">
            <p className="font-medium">{folder.folderName}</p>
            <p className="text-xs text-muted-foreground">
              {folder.invoiceCount} invoice{folder.invoiceCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatCurrency(folder.totalAmount)}</p>
          <p className="text-xs text-green-500">
            {formatCurrency(folder.paidAmount)} paid
          </p>
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 border-t bg-muted/30 space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hours</p>
              <p className="font-medium">{formatHours(folder.totalHours)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="font-medium text-orange-500">
                {formatCurrency(folder.pendingAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Overdue</p>
              <p className="font-medium text-red-500">
                {formatCurrency(folder.overdueAmount)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {folder.draftCount} draft
            </Badge>
            <Badge variant="outline" className="text-xs">
              {folder.sentCount} sent
            </Badge>
            <Badge variant="outline" className="text-xs">
              {folder.paidCount} paid
            </Badge>
            {folder.overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {folder.overdueCount} overdue
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAllClients, setShowAllClients] = useState(false);

  const { analytics: globalAnalytics, isLoading: globalLoading } = useGlobalAnalytics();
  const { analytics: foldersAnalytics, isLoading: foldersLoading } = useAllFoldersAnalytics();
  const { analytics: statusAnalytics, isLoading: statusLoading } = useAnalyticsByStatus();
  const { analytics: clientAnalytics, isLoading: clientsLoading } = useAnalyticsByClient();
  const { analytics: monthlyAnalytics, isLoading: monthlyLoading } = useMonthlyAnalytics(year);

  const isLoading = globalLoading || foldersLoading || statusLoading || clientsLoading || monthlyLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const displayedClients = showAllClients ? clientAnalytics : clientAnalytics.slice(0, 5);

  // Calculate max values for chart scaling
  const maxMonthlyInvoiced = Math.max(...monthlyAnalytics.map((m) => m.invoiced), 1);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(globalAnalytics?.totalAmount ?? 0)}
          subtitle={`${globalAnalytics?.invoiceCount ?? 0} invoices`}
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Paid"
          value={formatCurrency(globalAnalytics?.paidAmount ?? 0)}
          subtitle={`${globalAnalytics?.paidCount ?? 0} invoices`}
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Pending"
          value={formatCurrency(globalAnalytics?.pendingAmount ?? 0)}
          subtitle={`${globalAnalytics?.sentCount ?? 0} sent`}
          icon={<Clock className="h-5 w-5 text-orange-500" />}
        />
        <StatCard
          title="Total Hours"
          value={formatHours(globalAnalytics?.totalHours ?? 0)}
          subtitle={`Avg ${formatHours(globalAnalytics?.averageHoursPerInvoice ?? 0)}/invoice`}
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Status Breakdown
          </CardTitle>
          <CardDescription>
            Overview of invoices by current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(statusAnalytics).map(([status, data]) => {
              const colors = INVOICE_STATUS_COLORS[status as InvoiceStatus];
              return (
                <div
                  key={status}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${colors.bg} ${colors.text} border-0`}>
                      {INVOICE_STATUS_LABELS[status as InvoiceStatus]}
                    </Badge>
                    <span className="text-lg font-semibold">{data.count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(data.totalAmount)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>
                  Revenue and payments by month
                </CardDescription>
              </div>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyAnalytics.map((month) => {
                const monthName = new Date(month.month + "-01").toLocaleDateString("en-US", {
                  month: "short",
                });
                const invoicedPercent = (month.invoiced / maxMonthlyInvoiced) * 100;
                const paidPercent = (month.paid / maxMonthlyInvoiced) * 100;

                return (
                  <div key={month.month} className="flex items-center gap-3">
                    <span className="w-10 text-sm text-muted-foreground">
                      {monthName}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex h-2 gap-0.5">
                        <div
                          className="bg-blue-500 rounded-l"
                          style={{ width: `${invoicedPercent}%` }}
                        />
                        <div
                          className="bg-green-500 rounded-r"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-xs text-muted-foreground">
                        {month.count > 0 ? formatCurrency(month.invoiced) : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-muted-foreground">Invoiced</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-muted-foreground">Paid</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Clients
            </CardTitle>
            <CardDescription>
              Clients by total revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientAnalytics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No client data yet
              </p>
            ) : (
              <div className="space-y-4">
                {displayedClients.map((client, index) => (
                  <div
                    key={client.clientName}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-muted rounded-full">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{client.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.invoiceCount} invoice{client.invoiceCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(client.totalAmount)}</p>
                      {client.pendingAmount > 0 && (
                        <p className="text-xs text-orange-500">
                          {formatCurrency(client.pendingAmount)} pending
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {clientAnalytics.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAllClients(!showAllClients)}
                  >
                    {showAllClients ? "Show less" : `Show all ${clientAnalytics.length} clients`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Folder Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Analytics by Folder
          </CardTitle>
          <CardDescription>
            Revenue breakdown by folder
          </CardDescription>
        </CardHeader>
        <CardContent>
          {foldersAnalytics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No folders created yet
            </p>
          ) : (
            <div className="space-y-4">
              {foldersAnalytics.map((folder) => (
                <FolderAnalyticsCard key={folder.folderId} folder={folder} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
