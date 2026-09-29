"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import type { Accommodation, AccommodationId } from "@/types/accommodation";

import { PublicAvailabilityCalendar } from "./public-availability-calendar";

type PublicAvailabilityPageProps = Readonly<{
  accommodations: readonly Accommodation[];
}>;

export function PublicAvailabilityPage({
  accommodations,
}: PublicAvailabilityPageProps) {
  const { locale, messages } = useLocale();
  const copy = messages.availability;
  const firstAccommodationId = accommodations[0]?.id ?? "black-white-apartment";
  const [activeAccommodationId, setActiveAccommodationId] =
    useState<AccommodationId>(firstAccommodationId);
  const activeAccommodation = useMemo(
    () =>
      accommodations.find(
        (accommodation) => accommodation.id === activeAccommodationId,
      ) ?? accommodations[0],
    [accommodations, activeAccommodationId],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_32rem)] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {copy.badge}
            </p>
            <div className="mt-5 max-w-3xl">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {copy.description}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          <Tabs
            className="grid gap-8"
            onValueChange={(value) =>
              setActiveAccommodationId(value as AccommodationId)
            }
            value={activeAccommodationId}
          >
            <div className="-mt-6 overflow-x-auto pb-2">
              <TabsList
                aria-label={copy.tabsLabel}
                className="w-max max-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-card p-1 shadow-sm"
              >
                {accommodations.map((accommodation) => (
                  <TabsTrigger
                    className="min-w-[10rem]"
                    key={accommodation.id}
                    value={accommodation.id}
                  >
                    {accommodation.name[locale]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {activeAccommodation ? (
              <TabsContent value={activeAccommodation.id}>
                <article className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
                  <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {copy.badge}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-foreground">
                      {activeAccommodation.name[locale]}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {activeAccommodation.shortDescription[locale]}
                    </p>
                    <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                      <p className="rounded-2xl bg-muted/45 p-4 font-semibold text-foreground">
                        {copy.nightlyPricePrefix} $
                        {activeAccommodation.baseNightlyPriceUsd} USD{" "}
                        <span className="font-normal text-muted-foreground">
                          {copy.nightlyPriceSuffix}
                        </span>
                      </p>
                      <p>
                        {copy.maxGuestsPrefix} {activeAccommodation.maxGuests}{" "}
                        {messages.common.guests}
                      </p>
                    </div>
                    <Button asChild className="mt-6 rounded-full">
                      <Link href={`/alojamientos/${activeAccommodation.slug[locale]}`}>
                        {copy.viewAndBook}
                      </Link>
                    </Button>
                  </section>

                  <PublicAvailabilityCalendar
                    accommodationId={activeAccommodation.id}
                    copy={copy.calendar}
                  />
                </article>
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
