import Link from "next/link";
import { MapPin } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { esMessages } from "@/messages";

const messages = esMessages;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
        <Link
          aria-label={messages.navigation.homeAriaLabel}
          className="group flex items-center gap-3"
          href="/"
        >
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
            <BrandMark
              alt=""
              className="w-11"
              priority
              sizes="44px"
              width={44}
            />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold text-foreground">
              {siteConfig.brandName}
            </span>
            <span className="block text-xs text-muted-foreground">
              {messages.navigation.locationLabel}
            </span>
          </span>
        </Link>

        <nav
          aria-label={messages.navigation.mainAriaLabel}
          className="hidden items-center gap-6 md:flex"
        >
          {messages.navigation.items.map((item) => (
            <Link
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground lg:flex">
            <MapPin aria-hidden="true" className="size-4" />
            {messages.navigation.locationLabel}
          </div>
          <Button asChild className="rounded-full">
            <Link href="/alojamientos">{messages.common.bookNow}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
