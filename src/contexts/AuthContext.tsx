import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const GEO_RESTRICTION_ERROR = "Access restricted to Australian connections.";
const GEO_VERIFICATION_RETRY_ERROR = "Unable to verify geographic access. Please try again.";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signInWithMicrosoft: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const geoAccessStatus = useRef<"unknown" | "allowed" | "blocked">("unknown");
  const hasInitialized = useRef(false);
  const navigate = useNavigate();

  const verifyAustralianAccess = async () => {
    if (geoAccessStatus.current === "allowed") {
      return;
    }

    if (geoAccessStatus.current === "blocked") {
      throw new Error(GEO_RESTRICTION_ERROR);
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch("https://ipwho.is/", {
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        const geoData = await response.json();
        const isAustralia = geoData?.country_code === "AU";

        if (!isAustralia) {
          console.warn("Access attempt from non-Australian location", geoData);
          geoAccessStatus.current = "blocked";
          throw new Error(GEO_RESTRICTION_ERROR);
        }

        geoAccessStatus.current = "allowed";
        return;
      } catch (error) {
        if (error instanceof Error && error.message === GEO_RESTRICTION_ERROR) {
          throw error;
        }

        const isLastAttempt = attempt === maxAttempts;
        console.error(`Error verifying geographic access (attempt ${attempt}/${maxAttempts})`, error);

        if (isLastAttempt) {
          geoAccessStatus.current = "unknown";
          throw new Error(GEO_VERIFICATION_RETRY_ERROR);
        }

        await delay(200 * attempt);
      }
    }
  };

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      hasInitialized.current = true;
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only navigate after initialization and on specific events
        if (hasInitialized.current) {
          // Navigate to dashboard after password recovery
          if (event === "PASSWORD_RECOVERY") {
            navigate("/");
          }
          // Navigate to dashboard only when signing in from the auth page
          // Don't navigate on TOKEN_REFRESHED or INITIAL_SESSION events
          else if (event === "SIGNED_IN" && window.location.pathname === "/auth") {
            navigate("/");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMicrosoft = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    await verifyAustralianAccess();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const allowedDomain = "@con-formgroup.com.au";

    if (!normalizedEmail.endsWith(allowedDomain)) {
      const error = new Error("Sign ups are restricted to Con-form Group email addresses.");
      console.error("Sign up blocked: invalid email domain", { email: normalizedEmail });
      throw error;
    }

    const redirectUrl = `${window.location.origin}/`;
    
    await verifyAustralianAccess();

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signInWithMicrosoft,
        signUp,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
