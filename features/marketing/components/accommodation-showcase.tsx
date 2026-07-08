"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/features/i18n";
import type { Accommodation } from "@/types/accommodation";

type AccommodationShowcaseProps = Readonly<{
  accommodations: readonly Accommodation[];
}>;

export function AccommodationShowcase({ accommodations }: AccommodationShowcaseProps) {
  const { locale, messages } = useLocale();

  return (
    <section className="py-20" id="alojamientos">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge className="rounded-full" variant="secondary">
            {messages.home.accommodations.badge}
          </Badge>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {messages.home.accommodations.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {messages.home.accommodations.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
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
                      ? messages.home.accommodations.composedLabel
                      : messages.home.accommodations.privateLabel}
                  </Badge>
                  <Badge variant="outline">
                    {messages.home.accommodations.upToGuestsPrefix} {accommodation.maxGuests}{" "}
                    {messages.home.accommodations.guests}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{accommodation.name[locale]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  {accommodation.shortDescription[locale]}
                </p>
                <div className="flex items-end justify-between gap-4 rounded-2xl bg-muted/45 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.home.accommodations.from}
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      ${accommodation.baseNightlyPriceUsd}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {messages.home.accommodations.perNight}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {accommodation.bedrooms} {messages.home.accommodations.bedroomAbbr} · {accommodation.bathrooms}{" "}
                  {accommodation.bathrooms > 1
                    ? messages.home.accommodations.bathroomPlural
                    : messages.home.accommodations.bathroomSingular}
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
      </div>
    </section>
  );
}
