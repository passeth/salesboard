"use client";

import { createClient } from "@/lib/supabase/client";
import { Globe2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "no_account"
      ? "No account found for this Google login. Contact your administrator to get access."
      : null,
  );

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (magicLinkError) {
      setError(magicLinkError.message);
      setIsLoading(false);
      return;
    }

    setMessage("Magic link sent. Check your inbox to continue.");
    setIsLoading(false);
  };

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <section className="hidden bg-sidebar-background text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Globe2 className="size-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sidebar-foreground/70">
              Platform
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-sidebar-foreground">
              Trade Intel
            </h1>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight text-sidebar-foreground">
            Operational clarity for global export teams.
          </h2>
          <p className="text-sm text-sidebar-foreground/70">
            Review orders, coordinate vendor decisions, and keep logistics aligned in
            one control center.
          </p>
        </div>

        <p className="text-xs text-sidebar-foreground/60">
          Trusted by buyer, vendor, sales, logistics, and admin teams.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 space-y-1">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h2 className="text-2xl font-semibold text-card-foreground">Sign in</h2>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-input bg-transparent px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            <GoogleIcon className="size-5" />
            Sign in with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handlePasswordSignIn}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="••••••••"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-primary">{message}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            disabled={isLoading || !email}
            onClick={handleMagicLinkSignIn}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            Sign in with Magic Link
          </button>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
