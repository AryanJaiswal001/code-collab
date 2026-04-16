"use client";

import { useMemo } from "react";
import type { MergeRequestUser } from "./types";

type RoleLikeUser =
  | MergeRequestUser
  | {
      id?: string | null;
      name?: string | null;
      role?: string | null;
    }
  | null
  | undefined;

export function useUserRole(user: RoleLikeUser) {
  return useMemo(() => {
    const role = user?.role?.toLowerCase();
    const isAdmin = role === "admin" || role === "owner";

    return {
      role: isAdmin ? "admin" : "user",
      isAdmin,
      canReviewMergeRequests: isAdmin,
    };
  }, [user?.role]);
}

