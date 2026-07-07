import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { esMessages } from "@/messages";

const messages = esMessages;

export function TrustSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-sm">
          <CardContent className="grid gap-10 p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
            <div>
              <Badge className="rounded-full" variant="secondary">
                {messages.home.trust.badge}
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                {messages.home.trust.title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {messages.home.trust.description}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {messages.home.trust.items.map((item) => (
                <div className="rounded-2xl bg-muted p-5 text-sm font-medium text-foreground" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
