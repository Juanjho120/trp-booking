import { CalendarCheck, CreditCard, MailCheck, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";

const trustItems = [
  {
    icon: CalendarCheck,
    title: "Synced availability",
    description:
      "Airbnb calendars and direct reservations are synchronized to reduce booking conflicts.",
  },
  {
    icon: CreditCard,
    title: "Secure payments",
    description:
      "Payments are processed through Tilopay. Card details are never stored in TRP Booking.",
  },
  {
    icon: MailCheck,
    title: "Clear confirmations",
    description:
      "Guests receive reservation confirmations and arrival instructions by email.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent policies",
    description:
      "Cancellation, refund, house rules, and preparation buffers are documented clearly.",
  },
] as const;

export function TrustSection() {
  return (
    <section id="booking-preview" className="bg-muted/40 px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Trust first
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Built to feel reliable before the guest pays.
            </h2>
            <p className="text-lg leading-8 text-muted-foreground">
              {siteConfig.brandName} will use a professional booking flow with
              centralized messages, styled components, private admin tools, and
              clear reservation rules.
            </p>
          </div>

          <Card className="border-border/70 bg-card/80">
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                {trustItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="space-y-3">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-8" />

              <p className="text-sm leading-6 text-muted-foreground">
                Admin contact: {siteConfig.emails.admin}. Guest-facing emails:
                {" "}{siteConfig.emails.reservationsEs} and {" "}
                {siteConfig.emails.reservationsEn}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
