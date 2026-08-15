import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchMe } from "@/lib/api";

export default async function TripsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const user = await fetchMe(cookieHeader || undefined);
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Mina turer</h1>
          <p className="text-stone-600">Inloggad som {user.email}</p>
        </div>
        <Link href="/" className="text-sm text-emerald-800 hover:underline">
          Startsida
        </Link>
      </div>
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-stone-600">
        <p>Du har inga sparade turer ännu.</p>
        <p className="mt-2 text-sm">Trip builder kommer i Milestone 3.</p>
      </div>
    </main>
  );
}
