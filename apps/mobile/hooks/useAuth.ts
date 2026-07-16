import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAuthToken, setAuthToken, removeAuthToken } from "@/lib/auth";
import { type User, type Platform } from "@funfsterne/shared-types";

interface MagicLinkRequestInput {
  email: string;
}

interface MagicLinkVerifyInput {
  token: string;
  pushToken?: { token: string; platform: Platform };
}

interface MagicLinkVerifyResponse {
  user: User;
  tokens: string[];
}

interface UpdateProfileInput {
  name?: string;
  preferredBranchId?: string | null;
}

export function useAuthToken() {
  return useQuery<string | null>({
    queryKey: ["auth-token"],
    queryFn: getAuthToken,
    staleTime: Infinity,
  });
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["consumer", "me"],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return null;
      return apiFetch<User>("/consumer/me");
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRequestMagicLink() {
  return useMutation<{ sent: true }, Error, MagicLinkRequestInput>({
    mutationFn: (input) =>
      apiFetch<{ sent: true }>("/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useVerifyMagicLink() {
  const queryClient = useQueryClient();

  return useMutation<
    MagicLinkVerifyResponse,
    Error,
    MagicLinkVerifyInput
  >({
    mutationFn: async (input) => {
      const response = await apiFetch<MagicLinkVerifyResponse>(
        "/auth/magic-link/verify",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );

      const bearer = response.tokens[0];
      if (bearer) {
        await setAuthToken(bearer);
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-token"] });
      queryClient.invalidateQueries({ queryKey: ["consumer", "me"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, UpdateProfileInput>({
    mutationFn: (input) =>
      apiFetch<User>("/consumer/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumer", "me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await removeAuthToken();
    queryClient.invalidateQueries({ queryKey: ["auth-token"] });
    queryClient.invalidateQueries({ queryKey: ["consumer", "me"] });
    queryClient.clear();
  }, [queryClient]);
}
