import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSession, logout } from "@/lib/aidoru.functions";
import type { PublicUser } from "@/lib/game";

export const sessionKey = ["aidoru", "session"] as const;
const SESSION_SNAPSHOT_KEY = "aidoru.session.snapshot";

function readSessionSnapshot(): PublicUser | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : undefined;
  } catch {
    return undefined;
  }
}

export function useSession() {
  const fetchSession = useServerFn(getSession);
  const query = useQuery<PublicUser | null>({
    queryKey: sessionKey,
    queryFn: () =>
      Promise.race([
        fetchSession(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Session request timed out. Please refresh and try again.")), 12_000);
        }),
      ]),
    initialData: readSessionSnapshot,
    initialDataUpdatedAt: 0,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    retryOnMount: true,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("not configured")) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  useEffect(() => {
    if (query.data === undefined || typeof window === "undefined") return;
    try {
      if (query.data) window.sessionStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(query.data));
      else window.sessionStorage.removeItem(SESSION_SNAPSHOT_KEY);
    } catch {
      // Storage may be disabled or full; the live query remains authoritative.
    }
  }, [query.data]);

  return query;
}

/** Writes a fresh user object returned by a mutation into the session cache. */
export function useSessionWriter() {
  const queryClient = useQueryClient();
  return (user: PublicUser) => queryClient.setQueryData(sessionKey, user);
}

export function useLogout() {
  const queryClient = useQueryClient();
  const signOut = useServerFn(logout);
  return useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.setQueryData(sessionKey, null);
      queryClient.clear();
    },
  });
}
