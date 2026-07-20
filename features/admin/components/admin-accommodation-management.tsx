"use client";

import Link from "next/link";
import { BedDouble, Clock3, FilePenLine, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/features/i18n";
import type { AdminAccommodationContentSettings } from "@/types/admin-accommodation-content";
import type { AdminPreparationBufferSettings } from "@/types/admin-preparation-buffer-management";
import type { Locale } from "@/types/locale";

import { AdminAccommodationSettings } from "./admin-accommodation-settings";
import { AdminPageHeader } from "./admin-page-header";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminAccommodationManagement({
  initialContent,
  initialPreparationSettings,
}: Readonly<{
  initialContent: AdminAccommodationContentSettings;
  initialPreparationSettings: AdminPreparationBufferSettings;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations;
  const intlLocale = getIntlLocale(locale);

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatMoney(amount: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(amount));
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <section aria-labelledby="accommodation-content-heading">
        <div className="mb-5">
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="accommodation-content-heading"
          >
            {copy.overview.sectionTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.overview.sectionDescription}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {initialContent.properties.map((property) => {
            const propertyName = locale === "en" ? property.nameEn : property.nameEs;

            return (
              <Card className="border-border/70 bg-card shadow-sm" key={property.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FilePenLine aria-hidden="true" className="size-5" />
                    </div>
                    <Badge variant="secondary">
                      {copy.overview.statuses[property.status]}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{propertyName}</CardTitle>
                  <CardDescription className="break-all">
                    /alojamientos/{property.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {copy.overview.labels.capacity}
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 font-medium">
                        <Users aria-hidden="true" className="size-4" />
                        {property.maxGuests}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {copy.overview.labels.bedrooms}
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 font-medium">
                        <BedDouble aria-hidden="true" className="size-4" />
                        {property.bedrooms}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {copy.overview.labels.price}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {formatMoney(property.baseNightlyPrice, property.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {copy.overview.labels.checkIn}
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 font-medium">
                        <Clock3 aria-hidden="true" className="size-4" />
                        {property.checkInTime}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-xs leading-5 text-muted-foreground">
                    {copy.overview.labels.lastUpdated}: {formatDateTime(property.updatedAt)}
                  </p>

                  <Button asChild className="w-full">
                    <Link href={`/admin/accommodations/${property.id}`}>
                      <FilePenLine aria-hidden="true" />
                      {copy.overview.actions.editContent}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
          {copy.overview.notes.readonlyBoundaries}
        </div>
      </section>

      <section
        aria-labelledby="preparation-settings-heading"
        className="mt-12 border-t border-border pt-10"
      >
        <div className="mb-6">
          <Badge className="mb-4 rounded-full" variant="secondary">
            {copy.preparation.badge}
          </Badge>
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="preparation-settings-heading"
          >
            {copy.preparation.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.preparation.description}
          </p>
        </div>

        <AdminAccommodationSettings
          initialSettings={initialPreparationSettings}
          showHeader={false}
        />
      </section>
    </>
  );
}
