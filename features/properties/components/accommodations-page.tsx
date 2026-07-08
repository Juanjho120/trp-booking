"use client";

import Image from "next/image";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocaleSwitcher, useLocale } from "@/features/i18n";
import type { Accommodation } from "@/types/accommodation";

type AccommodationsPageProps = Readonly<{
  accommodations: readonly Accommodation[];
}>;

export function AccommodationsPage({ accommodations }: AccommodationsPageProps) {
  const { locale, messages } = useLocale();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_32rem)] py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Badge className="rounded-full" variant="secondary">
                {messages.properties.listing.badge}
              </Badge>
              <LocaleSwitcher />
            </div>
            <div className="mt-6 max-w-3xl">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                {messages.properties.listing.title}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {messages.properties.listing.description}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3 lg:px-8">
            {accommodations.map((accommodation) => (
              <Card
                className="group overflow-hidden rounded-[1.75rem] border-border/70 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                key={accommodation.id}
              >
                <div className="relative aspect-[16/11] overflow-hidden bg-muted">
                  <Image
                    alt={accommodation.coverImage.alt[locale]}
                    className="object-cover transition duration-500 group-hover:scale-105"
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    src={accommodation.coverImage.src}
                  />
                </div>
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={accommodation.kind === "composed" ? "default" : "secondary"}>
                      {accommodation.kind === "composed"
                        ? messages.properties.detail.composedLabel
                        : messages.properties.detail.privateLabel}
                    </Badge>
                    <Badge variant="outline">
                      {messages.common.upTo} {accommodation.maxGuests} {messages.common.guests}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{accommodation.name[locale]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {accommodation.shortDescription[locale]}
                  </p>
                  <div className="rounded-2xl bg-muted/45 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.common.from}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      ${accommodation.baseNightlyPriceUsd}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {messages.common.perNight}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {accommodation.bedrooms} {messages.common.bedrooms} · {accommodation.bathrooms}{" "}
                    {messages.common.bathrooms}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full rounded-full" variant="outline">
                    <Link href={`/alojamientos/${accommodation.slug.es}`}>
                      {messages.common.viewDetails}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
