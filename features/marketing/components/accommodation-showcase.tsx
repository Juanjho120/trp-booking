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
import { accommodations } from "@/config/accommodations";
import { esMessages } from "@/messages";

const messages = esMessages;

export function AccommodationShowcase() {
  return (
    <section className="bg-muted/35 py-20" id="alojamientos">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge className="rounded-full" variant="secondary">
            {messages.home.accommodations.badge}
          </Badge>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {messages.home.accommodations.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {messages.home.accommodations.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {accommodations.map((accommodation) => (
            <Card
              className="overflow-hidden rounded-[1.75rem] border-border/70 bg-card/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              key={accommodation.id}
            >
              <div className="relative aspect-[16/11] overflow-hidden bg-muted">
                <Image
                  alt={accommodation.coverImage.alt.es}
                  className="object-cover transition duration-500 hover:scale-105"
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  src={accommodation.coverImage.src}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              </div>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <Badge
                    className="rounded-full"
                    variant={accommodation.kind === "composed" ? "default" : "secondary"}
                  >
                    {accommodation.kind === "composed"
                      ? messages.home.accommodations.composedLabel
                      : messages.home.accommodations.privateLabel}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    {messages.home.accommodations.upToGuestsPrefix} {accommodation.maxGuests}{" "}
                    {messages.home.accommodations.guests}
                  </span>
                </div>
                <CardTitle className="mt-4 text-2xl">{accommodation.name.es}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {accommodation.shortDescription.es}
                </p>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {messages.home.accommodations.from}
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">
                      ${accommodation.baseNightlyPriceUsd}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        {messages.home.accommodations.perNight}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {accommodation.bedrooms} {messages.home.accommodations.bedroomAbbr} ·{" "}
                    {accommodation.bathrooms}{" "}
                    {accommodation.bathrooms > 1
                      ? messages.home.accommodations.bathroomPlural
                      : messages.home.accommodations.bathroomSingular}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full rounded-full">
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
