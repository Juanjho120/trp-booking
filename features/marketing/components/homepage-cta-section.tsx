import Link from "next/link";

import { Button } from "@/components/ui/button";
import { esMessages } from "@/messages";

const messages = esMessages;

export function HomepageCtaSection() {
  return (
    <section className="px-6 pb-20 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-primary-foreground shadow-xl shadow-primary/20 sm:px-10 lg:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-foreground/75">
              {messages.home.cta.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {messages.home.cta.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-primary-foreground/80">
              {messages.home.cta.description}
            </p>
          </div>

          <Button asChild className="rounded-full bg-background text-foreground hover:bg-background/90" size="lg">
            <Link href="#alojamientos">{messages.common.exploreAccommodations}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
