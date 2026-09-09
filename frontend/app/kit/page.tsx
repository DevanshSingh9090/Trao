"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api-client";

import LoadingState from "../../components/shared/LoadingState";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";

interface Kit {
  _id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
}

export default function KitsPage() {
  const router = useRouter();

  const [kits, setKits] =
    useState<Kit[]>([]);

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await apiRequest<{
          user: User;
        }>("/api/auth/me");

        setUser(me.user);

        const result = await apiRequest<{
          kits: Kit[];
        }>("/api/kits");

        setKits(result.kits);
      } catch (error) {
        if (
          error instanceof Error &&
          (
            error.message.includes("Authentication") ||
            error.message.includes("session")
          )
        ) {
          router.replace("/login");
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load kits"
        );
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
      const result = await apiRequest<{
        kit: Kit;
      }>("/api/kits", {
        method: "POST",
        body: JSON.stringify({}),
      });

      router.push(`/kits/${result.kit._id}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create kit"
      );
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to logout"
      );
    }
  }

  if (loading) {
    return (
      <LoadingState message="Loading your kits..." />
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/kits"
            className="font-bold"
          >
            Trao
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-500 sm:block">
              {user?.email}
            </span>

            <button
              onClick={logout}
              className="text-sm font-medium text-zinc-700 hover:text-black"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">
              Your interview kits
            </h1>

            <p className="mt-2 text-zinc-500">
              Create and manage your preparation kits.
            </p>
          </div>

          <button
            onClick={createKit}
            disabled={creating}
            className="rounded-lg bg-black px-5 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {creating
              ? "Creating..."
              : "Create draft kit"}
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
                      Interview Kit
                    </span>

                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs capitalize">
                      {kit.status}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-zinc-400">
                    Updated{" "}
                    {new Date(
                      kit.updatedAt
                    ).toLocaleString()}
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