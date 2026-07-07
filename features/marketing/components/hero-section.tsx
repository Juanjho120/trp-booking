import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAccommodationById } from "@/config/accommodations";
import { esMessages } from "@/messages";

const messages = esMessages;
const featuredAccommodation = getAccommodationById("complete-retreat");

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34rem)]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <Badge className="rounded-full px-4 py-1.5" variant="secondary">
            {messages.home.hero.badge}
          </Badge>

          <h1 className="mt-7 text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {messages.home.hero.title}
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
            {messages.home.hero.description}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full px-7 text-base">
              <Link href="#alojamientos">{messages.common.viewAccommodations}</Link>
            </Button>
            <Button asChild className="h-12 rounded-full px-7 text-base" variant="outline">
              <Link href="#beneficios">{messages.common.whyBookDirect}</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {messages.home.hero.highlights.map((highlight) => (
              <span
                className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm"
                key={highlight}
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardContent className="p-0">
            <div className="relative aspect-[4/5] min-h-[34rem] overflow-hidden bg-muted">
              {featuredAccommodation ? (
                <Image
                  alt={featuredAccommodation.coverImage.alt.es}
                  className="object-cover"
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  src={featuredAccommodation.coverImage.src}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 rounded-[1.5rem] border border-white/25 bg-background/90 p-6 shadow-xl backdrop-blur">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {messages.home.hero.bookingCard.eyebrow}
                </p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {messages.home.hero.bookingCard.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {messages.home.hero.bookingCard.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
