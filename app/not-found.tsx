"use client";

import { ArrowLeft, Home, MapPinOff } from "lucide-react";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n";

export default function NotFoundPage() {
  const { messages } = useLocale();
  const copy = messages.seo.notFoundAccommodation;
  const homeAction =
    messages.navigation.items[0]?.label ?? messages.common.brandName;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="flex min-h-[65vh] items-center px-6 py-16">
        <section className="mx-auto grid w-full max-w-2xl gap-6 rounded-[2rem] border border-border/70 bg-card p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPinOff aria-hidden="true" className="size-7" />
          </span>
          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              404
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.description}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="rounded-full">
              <Link href="/">
                <Home aria-hidden="true" />
                {homeAction}
              </Link>
            </Button>
            <Button asChild className="rounded-full" variant="outline">
              <Link href="/alojamientos">
                <ArrowLeft aria-hidden="true" />
                {messages.common.exploreAccommodations}
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
