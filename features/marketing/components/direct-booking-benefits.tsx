import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { esMessages } from "@/messages";

const messages = esMessages;

export function DirectBookingBenefits() {
  return (
    <section className="py-20" id="beneficios">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Badge className="rounded-full" variant="secondary">
              {messages.home.benefits.badge}
            </Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {messages.home.benefits.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {messages.home.benefits.description}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
            {messages.home.benefits.items.map((benefit, index) => (
              <Card
                className="rounded-[1.5rem] border-border/70 bg-card/80 shadow-sm"
                key={benefit.title}
              >
                <CardContent className="p-6">
                  <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
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
