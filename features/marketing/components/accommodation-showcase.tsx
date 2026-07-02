import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { accommodations } from "@/config/accommodations";

export function AccommodationShowcase() {
  return (
    <section className="bg-muted/35 py-20" id="alojamientos">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge className="rounded-full" variant="secondary">
            Alojamientos
          </Badge>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Elige el espacio ideal para tu estadía.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Reserva un alojamiento independiente o el refugio completo para disfrutar más privacidad y comodidad en grupo.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {accommodations.map((accommodation) => (
            <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-card/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl" key={accommodation.id}>
              <div className="aspect-[16/11] bg-[linear-gradient(135deg,_hsl(var(--primary)/0.18),_hsl(var(--muted)))]" />
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <Badge className="rounded-full" variant={accommodation.kind === "composed" ? "default" : "secondary"}>
                    {accommodation.kind === "composed" ? "Combinado" : "Privado"}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    Hasta {accommodation.maxGuests} huéspedes
                  </span>
                </div>
                <CardTitle className="text-2xl">{accommodation.name.es}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {accommodation.shortDescription.es}
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded-2xl bg-muted p-3">
                    <p className="font-semibold text-foreground">{accommodation.bedrooms}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Dorm.</p>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <p className="font-semibold text-foreground">{accommodation.bathrooms}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Baños</p>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <p className="font-semibold text-foreground">${accommodation.baseNightlyPriceUsd}</p>
                    <p className="mt-1 text-xs text-muted-foreground">/ noche</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full rounded-full" variant="outline">
                  Ver disponibilidad
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
