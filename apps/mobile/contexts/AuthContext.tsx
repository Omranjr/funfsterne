import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Keyboard } from "react-native";
import i18n from "@/lib/i18n";
import { logSwallowed } from "@/lib/log";
import { queryClient } from "@/lib/query-client";
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
} from "@/lib/auth";
import {
  registerConsumerUser,
  loginConsumerUser,
  deleteConsumerAccountRequest,
  getConsumerProfile,
  setUnauthorizedHandler,
  PublicApiError,
  ApiError,
  type ConsumerProfile,
} from "@/lib/api";

type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  // true while the initial SecureStore read (and, if a token exists, the
  // profile fetch that confirms it's still valid) is in flight -- callers
  // that gate rendering on auth state (the boot sequence) need to tell
  // "still checking" apart from "checked, not logged in".
  isLoading: boolean;
  isAuthenticated: boolean;
  user: ConsumerProfile | null;
  register: (input: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
  }) => Promise<AuthResult>;
  login: (input: { username: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// iOS only offers to save a just-entered password to Keychain if it gets a
// moment to notice the field was "submitted" -- unmounting the form
// immediately after a successful register/login (which swapping
// isAuthenticated to true does, via the boot sequence) can race ahead of
// that heuristic and silently skip the save-password prompt. Dismissing
// the keyboard and giving iOS a beat before the screen switches away gives
// it a fair chance to catch it.
//
// Deliberately NOT doing this via a per-field ref.blur() call: an earlier
// attempt at that froze the app on real devices, almost certainly from
// forcing a field to resign first responder while iOS's own "suggest a
// strong password" QuickType bar was still anchored to it -- interfering
// with system-owned UI mid-interaction is a known class of native hang,
// and it won't show up as a catchable JS error. Keyboard.dismiss() is the
// safe, already-verified-stable way to ask iOS to close that UI itself
// rather than us reaching in and doing it by force.
const SAVE_PASSWORD_GRACE_MS = 800;

async function letIosNoticeThePassword(): Promise<void> {
  Keyboard.dismiss();
  await new Promise((resolve) => setTimeout(resolve, SAVE_PASSWORD_GRACE_MS));
}

/**
 * Drops every cached response when the signed-in identity changes.
 *
 * Two of the cached queries are per-customer even though their keys are not:
 * `["loyalty","me"]` is the point balance and visit history, and
 * `["discount-codes","active"]` is filtered server-side to exclude coupons
 * this customer already used. The cache is also written to AsyncStorage and
 * kept for 24 hours, so without this the next person to sign in on a shared
 * phone was shown the previous one's points and offers until the refetch
 * landed -- and on a slow connection, for as long as that took.
 *
 * `clear()` rather than `invalidateQueries` on purpose: invalidating marks
 * data stale but keeps serving it while refetching, which is exactly the
 * window that must not exist here.
 */
function clearCachedUserData(): void {
  queryClient.clear();
}

function describeError(err: unknown): string {
  if (err instanceof PublicApiError) {
    if (err.errorCode === "USERNAME_TAKEN") {
      return i18n.t("auth.errors.usernameTaken");
    }
    return err.message;
  }
  return i18n.t("auth.errors.generic");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ConsumerProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAuthToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const profile = await getConsumerProfile();
        if (!cancelled) setUser(profile);
      } catch (err) {
        // Only the server gets to invalidate a token. 401 means the
        // credential is dead; 404 means the account behind it was deleted,
        // possibly from another device -- a JWT signature cannot reveal
        // either on its own.
        //
        // Anything else is us failing to ask the question, not an answer.
        // Discarding the token on a network error meant a cold backend --
        // which routinely takes longer than a request timeout to wake --
        // silently signed people out on launch. Now the token is kept and
        // the user stays on the sign-in screen for this launch only;
        // the next successful call restores them, and a genuinely dead
        // token is caught by the 401 handler the moment any screen calls
        // the API.
        const rejected =
          err instanceof ApiError && (err.status === 401 || err.status === 404);

        if (rejected) {
          await removeAuthToken();
        } else {
          logSwallowed("auth-boot-profile", err);
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    try {
      const res = await registerConsumerUser(input);
      await setAuthToken(res.token);
      // Whatever is cached belongs to whoever was signed in before.
      clearCachedUserData();
      await letIosNoticeThePassword();
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: describeError(err) };
    }
  }, []);

  const login = useCallback<AuthContextValue["login"]>(async (input) => {
    try {
      const res = await loginConsumerUser(input);
      await setAuthToken(res.token);
      // Whatever is cached belongs to whoever was signed in before.
      clearCachedUserData();
      await letIosNoticeThePassword();
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: describeError(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    await removeAuthToken();
    clearCachedUserData();
    setUser(null);
  }, []);

  // A 401 on a request that carried a token means the stored credential is
  // dead -- the account was deleted from the admin dashboard, JWT_SECRET was
  // rotated, or (once tokens expire) it simply aged out. Drop it and fall
  // back to the sign-in screen instead of leaving the user "logged in" with
  // every screen showing an error and no way out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const deleteAccount = useCallback<AuthContextValue["deleteAccount"]>(async () => {
    try {
      await deleteConsumerAccountRequest();
      await removeAuthToken();
      clearCachedUserData();
      setUser(null);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: describeError(err) };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: user !== null,
        user,
        register,
        login,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
