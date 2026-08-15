"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "email_taken" ? "E-postadressen används redan." : "Kunde inte skapa konto.");
      return;
    }

    router.push("/trips");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Skapa konto</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">E-post</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Lösenord (minst 8 tecken)</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "Skapar..." : "Skapa konto"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        Har du redan konto?{" "}
        <Link href="/login" className="text-emerald-800 hover:underline">
          Logga in
        </Link>
      </p>
    </main>
  );
}
