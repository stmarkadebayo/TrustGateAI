import Link from "next/link";

const modules = [
  {
    title: "Audit files",
    body: "Upload procurement or payment records and get a clear list of duplicate payments, split transactions, vendor risk, and missing controls.",
    href: "/audit",
    action: "Run an audit",
  },
  {
    title: "Verify documents",
    body: "Check PDFs and images for document type, required fields, extraction quality, and registry evidence when adapters are configured.",
    href: "/verify",
    action: "Verify documents",
  },
  {
    title: "Ask compliance questions",
    body: "Use a grounded assistant that answers from the bundled compliance corpus and shows the sources behind each answer.",
    href: "/chat",
    action: "Open assistant",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-stone-300/80 pb-5">
          <Link href="/" className="text-base font-semibold tracking-tight">
            TrustGateAI
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-stone-700">
            <Link href="/audit" className="hidden px-3 py-2 hover:text-stone-950 sm:block">
              Audit
            </Link>
            <Link href="/verify" className="hidden px-3 py-2 hover:text-stone-950 sm:block">
              Verify
            </Link>
            <Link href="/chat" className="hidden px-3 py-2 hover:text-stone-950 sm:block">
              Chat
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-stone-400 px-3 py-2 text-stone-900 hover:border-stone-700"
            >
              Workspace
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Anti-corruption workflow tools
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
              Review risky records before they become expensive problems.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
              TrustGateAI helps teams audit transaction files, verify vendor
              documents, and answer compliance questions. No account required.
              No hidden database. Clear outputs you can inspect.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/audit"
                className="rounded-md bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Start with an audit
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-stone-400 px-5 py-3 text-sm font-semibold text-stone-900 hover:border-stone-700"
              >
                View all tools
              </Link>
            </div>
          </div>

          <div className="border border-stone-300 bg-[#fffdf7] p-4 shadow-sm">
            <div className="border-b border-stone-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Current modules
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Pick the task you need to finish.
              </h2>
            </div>
            <div className="divide-y divide-stone-200">
              {modules.map((module) => (
                <Link
                  key={module.title}
                  href={module.href}
                  className="group grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-stone-950">
                      {module.title}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-stone-600">
                      {module.body}
                    </p>
                  </div>
                  <span className="w-fit rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 group-hover:border-emerald-800 group-hover:text-emerald-900">
                    {module.action}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden border border-stone-300 bg-stone-300 md:grid-cols-3">
          {[
            ["Runs locally first", "Deterministic checks produce the core findings before any AI explanation is added."],
            ["Built for public use", "The main workflows are available without sign-up, user profiles, or a runtime database."],
            ["Designed to be extended", "Rules, document packs, and corpus content live in the repo so contributors can improve them."],
          ].map(([title, body]) => (
            <div key={title} className="bg-[#fffdf7] p-5">
              <h3 className="font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
