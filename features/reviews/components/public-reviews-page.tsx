"use client";

import Link from "next/link";
import { Star } from "lucide-react";

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
import { useLocale } from "@/features/i18n";
import type { Locale } from "@/types/locale";
import type { PublicReviewsPageData } from "@/types/public-review";

type PublicReviewsPageProps = Readonly<{
  data: PublicReviewsPageData;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function buildReviewsPageHref(page: number): string {
  return page <= 1 ? "/resenas" : `/resenas?page=${page}`;
}

export function PublicReviewsPage({ data }: PublicReviewsPageProps) {
  const { locale, messages } = useLocale();
  const copy = messages.reviews.public;
  const intlLocale = getIntlLocale(locale);

  function formatPublicDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "America/Guatemala",
    }).format(new Date(value));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_32rem)] py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Badge className="rounded-full" variant="secondary">
              {copy.badge}
            </Badge>
            <div className="mt-6 max-w-3xl">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {copy.description}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {data.reviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {data.reviews.map((review, index) => {
                  const propertyName =
                    locale === "en"
                      ? review.property.nameEn
                      : review.property.nameEs;

                  return (
                    <Card
                      className="h-full border-border/70 bg-card shadow-sm"
                      key={`${review.submittedAt}-${review.property.slug}-${index}`}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-1 text-primary">
                          {Array.from({ length: review.rating }).map(
                            (_, starIndex) => (
                              <Star
                                aria-hidden="true"
                                className="size-4 fill-primary"
                                key={starIndex}
                              />
                            ),
                          )}
                        </div>
                        <CardTitle className="text-2xl">
                          {review.guestDisplayName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid flex-1 gap-5">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {review.comment}
                        </p>
                        <dl className="grid gap-3 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {copy.propertyLabel}
                            </dt>
                            <dd className="mt-1 font-medium text-foreground">
                              {propertyName}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {copy.submittedAtLabel}
                            </dt>
                            <dd className="mt-1 font-medium text-foreground">
                              {formatPublicDate(review.submittedAt)}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                      <CardFooter>
                        <Button asChild className="w-full" variant="outline">
                          <Link
                            href={`/alojamientos/${encodeURIComponent(
                              review.property.slug,
                            )}`}
                          >
                            {copy.viewAccommodation}
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed bg-muted/20 shadow-none">
                <CardContent className="py-14 text-center">
                  <h2 className="text-2xl font-semibold">
                    {copy.emptyTitle}
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {copy.emptyDescription}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              {data.pagination.page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={buildReviewsPageHref(data.pagination.page - 1)}>
                    {copy.previous}
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  {copy.previous}
                </Button>
              )}

              <p className="text-sm text-muted-foreground">
                {copy.page} {data.pagination.page} {copy.of}{" "}
                {data.pagination.totalPages}
              </p>

              {data.pagination.page < data.pagination.totalPages ? (
                <Button asChild variant="outline">
                  <Link href={buildReviewsPageHref(data.pagination.page + 1)}>
                    {copy.next}
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  {copy.next}
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
