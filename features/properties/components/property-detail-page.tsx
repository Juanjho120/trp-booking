"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/features/i18n";
import { ReservationRequestForm } from "@/features/reservations";
import type { Accommodation, AccommodationImage } from "@/types/accommodation";

import { AmenityIcon } from "./amenity-icon";

type PropertyDetailPageProps = Readonly<{
  accommodation: Accommodation;
}>;

type GalleryCopy = Readonly<{
  previous: string;
  next: string;
  open: string;
  close: string;
  counter: string;
}>;

function getGalleryCopy(locale: "es" | "en"): GalleryCopy {
  return locale === "en"
    ? {
        previous: "Previous photo",
        next: "Next photo",
        open: "Open all photos",
        close: "Close gallery",
        counter: "Photo",
      }
    : {
        previous: "Foto anterior",
        next: "Foto siguiente",
        open: "Ver todas las fotos",
        close: "Cerrar galería",
        counter: "Foto",
      };
}

export function PropertyDetailPage({ accommodation }: PropertyDetailPageProps) {
  const { locale, messages } = useLocale();
  const galleryImages = [accommodation.coverImage, ...accommodation.galleryImages];
  const galleryCopy = getGalleryCopy(locale);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl items-start gap-8 px-6 py-10 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div>
            <Button asChild className="rounded-full" variant="ghost">
              <Link href="/alojamientos">{messages.properties.detail.backToAccommodations}</Link>
            </Button>

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
              <p className="mt-6 max-w-4xl text-base leading-8 text-muted-foreground">
                {accommodation.longDescription[locale]}
              </p>
            </div>
          </div>

          <AccommodationGalleryCarousel
            copy={galleryCopy}
            images={galleryImages}
            title={messages.properties.detail.galleryTitle}
          />
        </section>

        <section className="mx-auto grid max-w-7xl items-stretch gap-8 px-6 pb-14 lg:grid-cols-2 lg:px-8 lg:pb-20">
          <SummaryCard accommodation={accommodation} />

          <Card className="flex h-full flex-col rounded-[2rem] border-border/70 bg-card shadow-lg">
            <CardHeader>
              <CardTitle>{messages.reservations.request.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ReservationRequestForm
                accommodationId={accommodation.id}
                maxGuests={accommodation.maxGuests}
              />
            </CardContent>
          </Card>
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

function SummaryCard({ accommodation }: Readonly<{ accommodation: Accommodation }>) {
  const { locale, messages } = useLocale();

  return (
    <Card className="flex h-full flex-col rounded-[2rem] border-border/70 bg-card shadow-lg">
      <CardHeader>
        <CardTitle>{messages.properties.detail.priceTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
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

        <div className="grid gap-3 text-sm text-muted-foreground">
          <DetailStat label={messages.properties.detail.maxGuests} value={`${accommodation.maxGuests}`} />
          <DetailStat label={messages.properties.detail.bedrooms} value={`${accommodation.bedrooms}`} />
          <DetailStat label={messages.properties.detail.bathrooms} value={`${accommodation.bathrooms}`} />
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}

function AccommodationGalleryCarousel({
  copy,
  images,
  title,
}: Readonly<{
  copy: GalleryCopy;
  images: readonly AccommodationImage[];
  title: string;
}>) {
  const { locale } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const activeImage = images[activeIndex] ?? images[0];

  function goToPrevious(): void {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    );
  }

  function goToNext(): void {
    setActiveIndex((currentIndex) =>
      currentIndex === images.length - 1 ? 0 : currentIndex + 1,
    );
  }

  if (!activeImage) {
    return null;
  }

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <Button className="rounded-full" onClick={() => setModalOpen(true)} type="button" variant="outline">
          <Images aria-hidden="true" className="mr-2 size-4" />
          {copy.open}
        </Button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-lg">
        <button
          aria-label={copy.open}
          className="group relative block aspect-[16/10] w-full overflow-hidden bg-muted text-left"
          onClick={() => setModalOpen(true)}
          type="button"
        >
          <Image
            alt={activeImage.alt[locale]}
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={activeImage.src}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-90" />
          <div className="absolute bottom-4 left-4 rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur">
            {copy.counter} {activeIndex + 1} / {images.length}
          </div>
        </button>

        {images.length > 1 ? (
          <div className="flex items-center gap-3 border-t border-border/70 bg-background p-3">
            <Button
              aria-label={copy.previous}
              className="size-10 shrink-0 rounded-full"
              onClick={goToPrevious}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>

            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => {
                const selected = index === activeIndex;

                return (
                  <button
                    aria-current={selected ? "true" : undefined}
                    aria-label={`${copy.counter} ${index + 1}`}
                    className={selected
                      ? "relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-primary bg-muted"
                      : "relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted opacity-70 transition hover:opacity-100"}
                    key={`${image.src}-${index}`}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <Image
                      alt={image.alt[locale]}
                      className="object-cover"
                      fill
                      sizes="6rem"
                      src={image.src}
                    />
                  </button>
                );
              })}
            </div>

            <Button
              aria-label={copy.next}
              className="size-10 shrink-0 rounded-full"
              onClick={goToNext}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <GalleryMosaicModal
          copy={copy}
          images={images}
          onClose={() => setModalOpen(false)}
          title={title}
        />
      ) : null}
    </section>
  );
}

function GalleryMosaicModal({
  copy,
  images,
  onClose,
  title,
}: Readonly<{
  copy: GalleryCopy;
  images: readonly AccommodationImage[];
  onClose: () => void;
  title: string;
}>) {
  const { locale } = useLocale();

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl flex-col px-6 py-5 lg:px-8">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {copy.counter} 1 / {images.length}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
          </div>
          <Button
            aria-label={copy.close}
            className="rounded-full"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            <X aria-hidden="true" className="mr-2 size-4" />
            {copy.close}
          </Button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <div className="grid auto-rows-[13rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((image, index) => (
              <div
                className={index === 0
                  ? "relative overflow-hidden rounded-[1.75rem] bg-muted sm:col-span-2 sm:row-span-2"
                  : "relative overflow-hidden rounded-[1.5rem] bg-muted"}
                key={`${image.src}-modal-${index}`}
              >
                <Image
                  alt={image.alt[locale]}
                  className="object-cover"
                  fill
                  sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                  src={image.src}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
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
