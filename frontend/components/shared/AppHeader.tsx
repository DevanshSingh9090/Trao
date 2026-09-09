"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api-client";
import type { User } from "../../lib/kit-types";

export default function AppHeader({
  user,
  backHref,
  backLabel,
}: {
  user?: User | null;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, still send the user to login —
      // the cookie may already be invalid/expired.
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/kits" className="font-bold">
            Trao
          </Link>

          {backHref && (
            <Link
              href={backHref}
              className="text-sm font-medium text-zinc-500 hover:text-black"
            >
              ← {backLabel || "Back"}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.email && (
            <span className="hidden text-sm text-zinc-500 sm:block">{user.email}</span>
          )}

          <button
            onClick={logout}
            className="text-sm font-medium text-zinc-700 hover:text-black"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
