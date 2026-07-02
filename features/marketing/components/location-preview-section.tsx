import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const locationHighlights = [
  "Cerca de Calle Santander",
  "A pocos minutos del Lago de Atitlán",
  "Ideal para descansar o explorar Panajachel",
] as const;

export function LocationPreviewSection() {
  return (
    <section className="bg-muted/35 py-20" id="ubicacion">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <Badge className="rounded-full" variant="secondary">
            Ubicación
          </Badge>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Panajachel, una base cómoda para vivir el Lago de Atitlán.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Los alojamientos están pensados para huéspedes que desean privacidad, buena ubicación y una estadía tranquila cerca de restaurantes, tiendas y acceso al lago.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {locationHighlights.map((highlight) => (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground" key={highlight}>
                {highlight}
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex aspect-[4/3] items-end bg-[linear-gradient(135deg,_hsl(var(--primary)/0.2),_hsl(var(--muted)),_hsl(var(--background)))] p-6">
              <div className="rounded-[1.5rem] border border-border/70 bg-background/90 p-5 shadow-lg backdrop-blur">
                <p className="text-sm font-semibold text-foreground">Mapa y fotos de llegada</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Las instrucciones detalladas de llegada se enviarán después de confirmar el pago.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
