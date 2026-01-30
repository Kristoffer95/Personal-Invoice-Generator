"use client";

import Link from "next/link";
import { ArrowLeft, User, FileText, FolderOpen, Palette, Users, FileImage, Mail, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityFeed } from "./ActivityFeed";
import { useUserDetail } from "@/hooks/use-admin";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface UserDetailPageProps {
  userId: Id<"users">;
}

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const { analytics, activities, isLoading } = useUserDetail(userId);
  const isAdmin = analytics?.isAdmin ?? false;

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { user, userProfile, stats, activityCounts } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.firstName || user.email}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName || user.email}
              </h1>
              {isAdmin && (
                <Badge variant="secondary">Admin</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">
                  {format(new Date(user.clerkCreatedAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Active</p>
                <p className="font-medium">
                  {stats.lastActivity
                    ? formatDistanceToNow(new Date(stats.lastActivity), {
                        addSuffix: true,
                      })
                    : "Never"}
                </p>
              </div>
            </div>
            {userProfile?.businessName && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Business</p>
                  <p className="font-medium">{userProfile.businessName}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Invoices"
          value={stats.invoiceCount}
          icon={<FileText className="h-4 w-4" />}
          description={`${activityCounts.INVOICE_CREATE ?? 0} created`}
        />
        <StatCard
          title="Folders"
          value={stats.folderCount}
          icon={<FolderOpen className="h-4 w-4" />}
          description={`${activityCounts.FOLDER_CREATE ?? 0} created`}
        />
        <StatCard
          title="Templates"
          value={stats.templateCount}
          icon={<Palette className="h-4 w-4" />}
          description={`${activityCounts.TEMPLATE_CREATE ?? 0} created`}
        />
        <StatCard
          title="PDF Exports"
          value={stats.pdfExportCount}
          icon={<FileImage className="h-4 w-4" />}
          description="Total exports"
        />
      </div>

      {/* Invoice Stats */}
      {Object.keys(stats.invoicesByStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Breakdown</CardTitle>
            <CardDescription>
              Distribution of invoices by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.invoicesByStatus).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-sm">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Stats */}
      {Object.keys(stats.revenueByCurrency).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue from Paid Invoices</CardTitle>
            <CardDescription>
              Total revenue by currency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.revenueByCurrency).map(([currency, amount]) => (
                <div key={currency} className="text-center">
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    }).format(amount as number)}
                  </p>
                  <p className="text-sm text-muted-foreground">{currency}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions performed by this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
