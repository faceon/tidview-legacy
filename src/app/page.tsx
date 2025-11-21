import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Tidview</p>
      <h1 className="text-4xl font-semibold sm:text-5xl">
        Market tides, mirrored on the web and in Chrome.
      </h1>
      <p className="max-w-2xl text-lg text-slate-300">
        This Next.js build hosts the same Polymarket portfolio UI that powers the
        extension. Jump into the shared experience below.
      </p>
      <Link
        href="/portfolio"
        className="rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white shadow-lg shadow-brand-primary/40 transition hover:scale-[1.01] hover:bg-brand-primary/90"
      >
        Open Portfolio
      </Link>
    </main>
  );
}
