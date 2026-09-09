"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api-client";
import type { Kit, User } from "../../lib/kit-types";

import LoadingState from "../../components/shared/LoadingState";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import AppHeader from "../../components/shared/AppHeader";

function isAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Authentication") || error.message.includes("session"))
  );
}

export default function KitsPage() {
  const router = useRouter();

  const [kits, setKits] = useState<Kit[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await apiRequest<{ user: User }>("/api/auth/me");
        setUser(me.user);

        const result = await apiRequest<{ kits: Kit[] }>("/api/kits");
        setKits(result.kits);
      } catch (err) {
        if (isAuthError(err)) {
          router.replace("/login");
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load kits");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function createKit() {
    setCreating(true);
    setError("");

    try {
      const result = await apiRequest<{ kit: Kit }>("/api/kits", {
        method: "POST",
        body: JSON.stringify({}),
      });

      router.push(`/kits/${result.kit._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create kit");
      setCreating(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading your kits..." />;
  }

  const statusStyles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    generating: "bg-amber-100 text-amber-700",
    ready: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <AppHeader user={user} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Your interview kits</h1>
            <p className="mt-2 text-zinc-500">Create and manage your preparation kits.</p>
          </div>

          <button
            onClick={createKit}
            disabled={creating}
            className="rounded-lg bg-black px-5 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create draft kit"}
          </button>
        </div>

        {error && (
          <div className="mt-6">
            <ErrorState message={error} />
          </div>
        )}

        <div className="mt-8">
          {kits.length === 0 ? (
            <EmptyState
              title="No interview kits yet"
              description="Create your first draft kit to get started."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kits.map((kit) => (
                <Link
                  key={kit._id}
                  href={`/kits/${kit._id}`}
                  className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {kit.source?.role || kit.source?.company || "Interview Kit"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-xs capitalize ${
                        statusStyles[kit.status] || "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {kit.status}
                    </span>
                  </div>

                  {kit.source?.company && (
                    <p className="mt-2 text-sm text-zinc-500">{kit.source.company}</p>
                  )}

                  <p className="mt-4 text-xs text-zinc-400">
                    Updated {new Date(kit.updatedAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
