import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Public Workspace
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">
            Open modules, no account required.
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600">
            This workspace is the public surface for TrustGateAI. The product is
            being repositioned around lightweight tools that are easy to use,
            easy to host, and easy for contributors to extend.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Audit Automation",
              body: "Upload CSV, XLSX, or JSON records, infer columns, run deterministic fraud rules, and export findings.",
              href: "/audit",
            },
            {
              title: "Document Verification",
              body: "Extract text from PDFs and images, classify the document, run integrity checks, and attach registry evidence when configured.",
              href: "/verify",
            },
            {
              title: "Compliance Chatbot",
              body: "Answer grounded compliance questions from a bundled local handbook corpus with explicit supporting passages.",
              href: "/chat",
            },
          ].map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-zinc-900">
                {module.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{module.body}</p>
              <div className="mt-4 text-sm font-medium text-zinc-900">Open module</div>
            </Link>
          ))}
        </section>

        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
          All modules are public by default. AI explanations and registry checks
          improve when environment-based adapters are configured, but the core
          deterministic flows still work without them.
        </div>
      </div>
    </div>
  );
}
