import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    title: "Comunicación directa",
    description:
      "Habla directamente con el anfitrión antes y después de reservar, sin depender de intermediarios.",
  },
  {
    title: "Pago seguro en línea",
    description:
      "El flujo de pago estará integrado con Tilopay y la reserva se confirmará únicamente después del pago aprobado.",
  },
  {
    title: "Disponibilidad sincronizada",
    description:
      "El calendario se sincronizará con Airbnb para reducir el riesgo de reservas duplicadas.",
  },
] as const;

export function DirectBookingBenefits() {
  return (
    <section className="py-20" id="beneficios">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Badge className="rounded-full" variant="secondary">
              Reserva directa
            </Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Una experiencia clara, confiable y sin complicaciones.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              El sitio está diseñado para que el huésped pueda revisar información importante, consultar disponibilidad y completar su reserva con confianza.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
            {benefits.map((benefit, index) => (
              <Card className="rounded-[1.5rem] border-border/70 bg-card/80" key={benefit.title}>
                <CardContent className="p-6">
                  <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                    0{index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
