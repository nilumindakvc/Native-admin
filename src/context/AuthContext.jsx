import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { api, ApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // our /me record (role, etc.)
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  async function loadProfile() {
    try {
      setProfileError(null);
      const me = await api.get("/me");
      setProfile(me);
    } catch (err) {
      setProfile(null);
      if (err instanceof ApiError) setProfileError(err.message);
      else setProfileError("Could not reach the backend API.");
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) loadProfile().finally(() => active && setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadProfile();
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await loadProfile();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const value = {
    session,
    profile,
    loading,
    profileError,
    isAuthenticated: !!session,
    isAdmin: profile?.role === "admin",
    signIn,
    signOut,
    reloadProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
