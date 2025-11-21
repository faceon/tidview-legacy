import Link from "next/link";
import { ArrowRight, Chrome, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Unified codebase",
    description:
      "Ship the marketing site and Chrome extension UI from the same Next.js route tree.",
    icon: <ArrowRight className="h-5 w-5" />,
  },
  {
    title: "MV3-ready service worker",
    description:
      "Background polling keeps using chrome.alarms + fetch, never Next.js API routes.",
    icon: <RefreshCw className="h-5 w-5" />,
  },
  {
    title: "Side panel or popup",
    description:
      "Toggle where Tidview opens via a storage-backed switch that mirrors the website view.",
    icon: <Chrome className="h-5 w-5" />,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 lg:py-24">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
            Next.js 15 App Router · Chrome MV3
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Track your Polymarket tides from the web and Chrome toolbar.
          </h1>
          <p className="text-lg text-muted-foreground">
            Tidview now lives in a single Next.js monorepo. Render the same
            polished portfolio UI at tidview.com and as a Chrome side panel or
            popup without juggling duplicate code.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2"
              >
                Open portfolio <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link
                href="https://github.com/faceon/tidview"
                target="_blank"
                className="inline-flex items-center gap-2"
              >
                View source <Chrome className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-6 shadow-xl shadow-primary/5">
          <div className="aspect-[4/3] w-full rounded-xl border border-dashed border-border/80 bg-background p-6">
            <p className="text-sm font-semibold text-primary">tidview.com</p>
            <div className="mt-4 h-[65%] rounded-xl border border-border/70 bg-muted/40" />
            <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
              Chrome side panel · Popup · Web
            </p>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            A single Lit-inspired UI rendered by Next.js locally and inside
            Chrome.
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="border-border/80 bg-card/70">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                {feature.icon}
              </div>
              <CardTitle className="text-base font-semibold">
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {feature.description}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
