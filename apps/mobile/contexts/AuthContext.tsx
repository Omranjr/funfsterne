import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Keyboard } from "react-native";
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
  PublicApiError,
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
// the keyboard and giving iOS a brief beat before the screen switches away
// gives it a fair chance to catch it.
const SAVE_PASSWORD_GRACE_MS = 400;

async function letIosNoticeThePassword(): Promise<void> {
  Keyboard.dismiss();
  await new Promise((resolve) => setTimeout(resolve, SAVE_PASSWORD_GRACE_MS));
}

function describeError(err: unknown): string {
  if (err instanceof PublicApiError) {
    if (err.errorCode === "USERNAME_TAKEN") {
      return "That username is already taken.";
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
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
        // A 404 here means the account behind this token was deleted (e.g.
        // via the account-deletion flow, possibly on another device) --
        // the JWT signature alone can't reveal that, only the server can.
        // Any other failure (network blip) is treated the same way: fail
        // closed to the login screen rather than silently pretending to be
        // authenticated with no profile data to show.
        await removeAuthToken();
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
      await letIosNoticeThePassword();
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: describeError(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    await removeAuthToken();
    setUser(null);
  }, []);

  const deleteAccount = useCallback<AuthContextValue["deleteAccount"]>(async () => {
    try {
      await deleteConsumerAccountRequest();
      await removeAuthToken();
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
