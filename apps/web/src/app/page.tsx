import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Turbok</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Planera digitalt. Vandra analogt.
        </h1>
        <p className="max-w-2xl text-lg text-stone-600">
          Kartbaserat planeringsverktyg för självplanerade flerdagarsvandringar i fjällen.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-md bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800"
        >
          Skapa konto
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-stone-300 px-4 py-2 hover:bg-stone-100"
        >
          Logga in
        </Link>
        <Link href="/trips" className="rounded-md px-4 py-2 text-emerald-800 hover:underline">
          Mina turer
        </Link>
      </div>
    </main>
  );
}
