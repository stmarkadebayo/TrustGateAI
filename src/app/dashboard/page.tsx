import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-stone-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between border-b border-stone-300/80 pb-5">
          <Link href="/" className="text-base font-semibold tracking-tight">
            TrustGateAI
          </Link>
          <Link
            href="/"
            className="rounded-md border border-stone-400 px-3 py-2 text-sm font-semibold text-stone-900 hover:border-stone-700"
          >
            Home
          </Link>
        </header>

        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            Choose a review workflow.
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-700">
            Use TrustGateAI to review transaction files, inspect document
            bundles, or ask compliance questions with cited answers. The core
            checks run without an account.
          </p>
        </div>

        <section className="grid gap-px overflow-hidden border border-stone-300 bg-stone-300 md:grid-cols-3">
          {[
            {
              title: "Audit files",
              body: "Upload CSV, XLSX, or JSON records, infer columns, run fraud and control rules, and export findings.",
              href: "/audit",
              action: "Run audit",
            },
            {
              title: "Verify documents",
              body: "Extract text from PDFs and images, classify documents, check required fields, and attach registry evidence when configured.",
              href: "/verify",
              action: "Verify bundle",
            },
            {
              title: "Ask compliance questions",
              body: "Get grounded answers from the bundled compliance corpus with supporting passages shown beside the answer.",
              href: "/chat",
              action: "Open assistant",
            },
          ].map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="group bg-[#fffdf7] p-6 hover:bg-white"
            >
              <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                {module.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">{module.body}</p>
              <div className="mt-5 text-sm font-semibold text-emerald-900">
                {module.action}
              </div>
            </Link>
          ))}
        </section>

        <div className="border border-stone-300 bg-[#fffdf7] p-5 text-sm leading-6 text-stone-600">
          Optional AI explanations and registry checks improve when production
          environment adapters are configured. The deterministic review flows
          still work without them.
        </div>
      </div>
    </div>
  );
}
