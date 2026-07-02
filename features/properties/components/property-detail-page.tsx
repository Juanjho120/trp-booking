import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Accommodation } from "@/types/accommodation";

type PropertyDetailPageProps = Readonly<{
  accommodation: Accommodation;
}>;

export function PropertyDetailPage({ accommodation }: PropertyDetailPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_34rem)] py-10 md:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Button asChild className="rounded-full" variant="ghost">
              <Link href="/alojamientos">← Volver a alojamientos</Link>
            </Button>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.75fr] lg:items-start">
              <div>
                <Badge className="rounded-full" variant={accommodation.kind === "composed" ? "default" : "secondary"}>
                  {accommodation.kind === "composed" ? "Alojamiento combinado" : "Alojamiento privado"}
                </Badge>
                <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                  {accommodation.name.es}
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {accommodation.longDescription.es}
                </p>
              </div>

              <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-xl shadow-primary/10">
                <CardHeader>
                  <CardTitle className="text-2xl">Resumen de reserva</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Desde</p>
                    <p className="mt-2 text-4xl font-semibold">
                      ${accommodation.baseNightlyPriceUsd}
                      <span className="text-base font-normal text-muted-foreground"> / noche</span>
                    </p>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-2xl bg-muted p-4">
                      <p className="font-semibold text-foreground">{accommodation.maxGuests}</p>
                      <p className="text-xs text-muted-foreground">huéspedes</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-4">
                      <p className="font-semibold text-foreground">{accommodation.bedrooms}</p>
                      <p className="text-xs text-muted-foreground">hab.</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-4">
                      <p className="font-semibold text-foreground">{accommodation.bathrooms}</p>
                      <p className="text-xs text-muted-foreground">baño{accommodation.bathrooms > 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                    <p className="text-sm font-semibold text-foreground">{accommodation.arrivalPolicy.checkInFrom.es}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {accommodation.arrivalPolicy.earlyCheckInNote.es}
                    </p>
                  </div>

                  <Button className="mt-6 w-full rounded-full" disabled>
                    Calendario próximamente
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    La disponibilidad, reserva y pago se conectarán en fases posteriores.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {accommodation.highlights.es.map((highlight) => (
                <div className="rounded-2xl border border-border bg-card p-5 text-sm font-medium text-foreground" key={highlight}>
                  {highlight}
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Amenidades principales</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {accommodation.amenities.es.map((amenity) => (
                  <div className="rounded-2xl bg-muted p-4 text-sm text-foreground" key={amenity}>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/35 py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <Badge className="rounded-full" variant="secondary">
                Reglas
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">Antes de reservar</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Estas reglas ayudan a mantener un ambiente tranquilo, seguro y cómodo para todos los huéspedes.
              </p>
            </div>

            <Card className="rounded-[2rem] border-border/70 bg-card">
              <CardContent className="p-6">
                <div className="grid gap-3">
                  {accommodation.rules.es.map((rule) => (
                    <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground" key={rule}>
                      {rule}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
