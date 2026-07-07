import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { esMessages } from "@/messages";

const messages = esMessages;

export function HomepageCtaSection() {
  return (
    <section className="px-6 pb-20 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-primary px-6 py-14 text-primary-foreground shadow-xl shadow-primary/20 sm:px-10 lg:px-14">
        <Badge className="rounded-full bg-primary-foreground/15 text-primary-foreground" variant="secondary">
          {messages.home.cta.badge}
        </Badge>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {messages.home.cta.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-primary-foreground/80">
              {messages.home.cta.description}
            </p>
          </div>
          <Button asChild className="rounded-full" size="lg" variant="secondary">
            <Link href="/alojamientos">{messages.common.exploreAccommodations}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
