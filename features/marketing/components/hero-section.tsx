import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

const heroHighlights = [
  "Reservas directas seguras",
  "Alojamientos privados",
  "Cerca del Lago de Atitlán",
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34rem)]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <Badge className="rounded-full px-4 py-1.5" variant="secondary">
            Panajachel · Lago de Atitlán
          </Badge>

          <h1 className="mt-7 text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Tu descanso privado en Panajachel.
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
            {siteConfig.publicName} reúne alojamientos cómodos, privados y bien ubicados para reservar directamente cerca del Lago de Atitlán.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full px-7 text-base">
              <Link href="#alojamientos">Ver alojamientos</Link>
            </Button>
            <Button asChild className="h-12 rounded-full px-7 text-base" variant="outline">
              <Link href="#beneficios">Por qué reservar directo</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {heroHighlights.map((highlight) => (
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
              <div className="absolute inset-0 bg-[linear-gradient(145deg,_hsl(var(--primary)/0.25),_transparent_45%),linear-gradient(315deg,_hsl(var(--muted)),_hsl(var(--background)))]" />
              <div className="absolute inset-x-6 bottom-6 rounded-[1.5rem] border border-border/70 bg-background/90 p-6 shadow-xl backdrop-blur">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Direct Booking
                </p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  Reserva directo, evita intermediarios y recibe confirmación por correo.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Próximamente integraremos disponibilidad, pagos seguros con Tilopay y sincronización con Airbnb.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
