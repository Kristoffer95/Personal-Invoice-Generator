"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { User, FileText, FileImage, ChevronRight } from "lucide-react";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";

type UserStats = {
  invoiceCount: number;
  folderCount: number;
  templateCount: number;
  pdfExportCount: number;
  lastActivity: number | null;
};

type UserWithStats = Doc<"users"> & {
  stats: UserStats;
};

interface UsersTableProps {
  users: UserWithStats[];
  isLoading: boolean;
}

export function UsersTable({ users, isLoading }: UsersTableProps) {
  const router = useRouter();

  const handleRowClick = (userId: Id<"users">) => {
    router.push(`/admin/users/${userId}`);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading users...
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          No users found
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                User
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                Joined
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                Last Active
              </th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                Invoices
              </th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden sm:table-cell">
                Exports
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user._id}
                className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => handleRowClick(user._id)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {user.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.firstName || user.email}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName || user.email}
                        </span>
                        {user.role === "admin" && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.clerkCreatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {user.stats.lastActivity
                      ? formatDistanceToNow(new Date(user.stats.lastActivity), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.stats.invoiceCount}</span>
                  </div>
                </td>
                <td className="p-4 text-center hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.stats.pdfExportCount}</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
