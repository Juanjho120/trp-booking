import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { accommodations } from "@/config/accommodations";

export function AccommodationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_32rem)] py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Badge className="rounded-full" variant="secondary">
              Alojamientos
            </Badge>
            <div className="mt-6 max-w-3xl">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                Espacios privados para descansar en Panajachel.
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Explora cada opción disponible y elige entre un apartamento privado, un bungalow familiar o el refugio completo para grupos pequeños.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3 lg:px-8">
            {accommodations.map((accommodation) => (
              <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-card shadow-sm" key={accommodation.id}>
                <div className="aspect-[16/11] bg-[linear-gradient(135deg,_hsl(var(--primary)/0.18),_hsl(var(--muted)))]" />
                <CardHeader>
                  <Badge className="w-fit rounded-full" variant={accommodation.kind === "composed" ? "default" : "secondary"}>
                    {accommodation.kind === "composed" ? "Combinado" : "Privado"}
                  </Badge>
                  <CardTitle className="pt-3 text-2xl">{accommodation.name.es}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {accommodation.shortDescription.es}
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="font-semibold text-foreground">{accommodation.maxGuests}</p>
                      <p className="text-xs text-muted-foreground">huéspedes</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="font-semibold text-foreground">{accommodation.bedrooms}</p>
                      <p className="text-xs text-muted-foreground">hab.</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="font-semibold text-foreground">${accommodation.baseNightlyPriceUsd}</p>
                      <p className="text-xs text-muted-foreground">noche</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full rounded-full">
                    <Link href={`/alojamientos/${accommodation.slug.es}`}>Ver detalles</Link>
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
