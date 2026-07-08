"use client";

import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/features/i18n";

export function TrustSection() {
  const { messages } = useLocale();

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Card className="rounded-[2rem] border-border/70 bg-card shadow-sm">
          <CardContent className="grid gap-10 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
            <div>
              <Badge className="rounded-full" variant="secondary">
                {messages.home.trust.badge}
              </Badge>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {messages.home.trust.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {messages.home.trust.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {messages.home.trust.items.map((item) => (
                <div
                  className="flex gap-3 rounded-2xl border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground"
                  key={item}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
