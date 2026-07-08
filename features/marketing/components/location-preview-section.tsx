"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/features/i18n";

export function LocationPreviewSection() {
  const { messages } = useLocale();

  return (
    <section className="bg-muted/35 py-20" id="ubicacion">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <Badge className="rounded-full" variant="secondary">
            {messages.home.location.badge}
          </Badge>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {messages.home.location.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {messages.home.location.description}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {messages.home.location.highlights.map((highlight) => (
              <div
                className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground shadow-sm"
                key={highlight}
              >
                {highlight}
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex aspect-[4/3] items-end bg-[linear-gradient(135deg,_hsl(var(--primary)/0.2),_hsl(var(--muted)),_hsl(var(--background)))] p-6">
              <div className="rounded-[1.5rem] border border-border/70 bg-background/90 p-5 shadow-lg backdrop-blur">
                <p className="text-sm font-semibold text-foreground">
                  {messages.home.location.mapTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {messages.home.location.mapDescription}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
