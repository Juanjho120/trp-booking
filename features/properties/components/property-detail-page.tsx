"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LocaleSwitcher, useLocale } from "@/features/i18n";
import { ReservationRequestForm } from "@/features/reservations";
import type { Accommodation } from "@/types/accommodation";

import { AmenityIcon } from "./amenity-icon";

type PropertyDetailPageProps = Readonly<{
  accommodation: Accommodation;
}>;

export function PropertyDetailPage({ accommodation }: PropertyDetailPageProps) {
  const { locale, messages } = useLocale();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button asChild className="rounded-full" variant="ghost">
                <Link href="/alojamientos">{messages.properties.detail.backToAccommodations}</Link>
              </Button>
              <LocaleSwitcher />
            </div>

            <div className="mt-8">
              <Badge
                className="rounded-full"
                variant={accommodation.kind === "composed" ? "default" : "secondary"}
              >
                {accommodation.kind === "composed"
                  ? messages.properties.detail.composedLabel
                  : messages.properties.detail.privateLabel}
              </Badge>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                {accommodation.name[locale]}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground">
                {accommodation.longDescription[locale]}
              </p>
            </div>
          </div>

          <Card className="h-fit rounded-[2rem] border-border/70 bg-card shadow-lg">
            <CardHeader>
              <CardTitle>{messages.properties.detail.priceTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl bg-muted/45 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {messages.properties.detail.from}
                </p>
                <p className="mt-1 text-4xl font-semibold text-foreground">
                  ${accommodation.baseNightlyPriceUsd}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.properties.detail.perNight}
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1">
                <DetailStat label={messages.properties.detail.maxGuests} value={`${accommodation.maxGuests}`} />
                <DetailStat label={messages.properties.detail.bedrooms} value={`${accommodation.bedrooms}`} />
                <DetailStat label={messages.properties.detail.bathrooms} value={`${accommodation.bathrooms}`} />
              </div>

              <Separator />

              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {messages.properties.detail.checkIn}:
                  </span>{" "}
                  {accommodation.arrivalPolicy.checkInFrom[locale]}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {messages.properties.detail.earlyCheckIn}:
                  </span>{" "}
                  {accommodation.arrivalPolicy.earlyCheckInNote[locale]}
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">
                  {messages.properties.detail.preparationBuffer}
                </p>
                <p className="mt-2">
                  {accommodation.preparationBuffer.daysBefore}{" "}
                  {messages.properties.detail.preparationBufferBefore} ·{" "}
                  {accommodation.preparationBuffer.daysAfter}{" "}
                  {messages.properties.detail.preparationBufferAfter}
                </p>
                <p className="mt-2">{messages.properties.detail.preparationBufferDescription}</p>
              </div>

              <ReservationRequestForm
                accommodationId={accommodation.id}
                maxGuests={accommodation.maxGuests}
              />
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {messages.properties.detail.galleryTitle}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[accommodation.coverImage, ...accommodation.galleryImages].map((image) => (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-muted" key={image.src}>
                <Image
                  alt={image.alt[locale]}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  src={image.src}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-3 lg:px-8">
          <InfoCard title={messages.properties.detail.highlightsTitle}>
            <ul className="grid gap-3">
              {accommodation.highlights[locale].map((highlight) => (
                <li className="text-sm leading-6 text-muted-foreground" key={highlight}>
                  {highlight}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title={messages.properties.detail.amenitiesTitle}>
            <ul className="grid gap-3">
              {accommodation.amenities.map((amenity) => (
                <li className="flex items-center gap-3 text-sm text-muted-foreground" key={amenity.key}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <AmenityIcon className="size-4" name={amenity.icon} />
                  </span>
                  {amenity.label[locale]}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title={messages.properties.detail.rulesTitle}>
            <ul className="grid gap-3">
              {accommodation.rules[locale].map((rule) => (
                <li className="text-sm leading-6 text-muted-foreground" key={rule}>
                  {rule}
                </li>
              ))}
            </ul>
          </InfoCard>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

type DetailStatProps = Readonly<{
  label: string;
  value: string;
}>;

function DetailStat({ label, value }: DetailStatProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

type InfoCardProps = Readonly<{
  children: ReactNode;
  title: string;
}>;

function InfoCard({ children, title }: InfoCardProps) {
  return (
    <Card className="rounded-[1.5rem] border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
