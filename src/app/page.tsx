import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f4f5,transparent_60%)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold tracking-wide text-zinc-900">
          TrustGateAI
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-800 hover:border-zinc-400"
          >
            Open workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-20">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Open Integrity Toolkit
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
            Lightweight anti-corruption tools anyone can run without an account.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-600">
            TrustGateAI is an open source public utility for audit automation,
            document verification, and grounded compliance guidance. The goal is
            to keep the core analyses transparent, usable without sign-up, and
            easy for other engineers to improve.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Try the workspace
            </Link>
          </div>
        </div>

        <section className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Real analysis",
              body: "Deterministic audit and verification engines run first, with AI layered on for explanation instead of hidden decision-making.",
            },
            {
              title: "No account wall",
              body: "All three modules are public by default and do not depend on a database or user profile to work.",
            },
            {
              title: "Grounded answers",
              body: "The compliance chatbot answers only from a bundled local corpus and shows the passages that support the answer.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-zinc-900">{card.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{card.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
