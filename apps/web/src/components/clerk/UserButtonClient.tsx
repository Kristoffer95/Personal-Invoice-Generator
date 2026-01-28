"use client";

import { type ComponentProps } from "react";
import { UserButton } from "@clerk/nextjs";

type UserButtonProps = ComponentProps<typeof UserButton>;

/**
 * Client-side wrapper for Clerk's UserButton component.
 * This component is designed to be dynamically imported with ssr: false
 * to prevent hydration mismatch errors that occur when UserButton
 * renders differently on server vs client due to authentication state.
 */
export function UserButtonClient(props: UserButtonProps) {
  return <UserButton {...props} />;
}
