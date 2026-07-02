import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

const navigationItems = [
  { label: "Inicio", href: "/" },
  { label: "Alojamientos", href: "/alojamientos" },
  { label: "Beneficios", href: "/#beneficios" },
  { label: "Ubicación", href: "/#ubicacion" },
  { label: "Contacto", href: "/#contacto" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link aria-label="Go to homepage" className="group flex items-center gap-3" href="/">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-border bg-card text-sm font-semibold text-primary shadow-sm transition group-hover:shadow-md">
            TRP
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {siteConfig.brandName}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Panajachel, Guatemala
            </span>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          {navigationItems.map((item) => (
            <Link
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild className="hidden rounded-full md:inline-flex">
            <Link href="/alojamientos">Reservar ahora</Link>
          </Button>
          <Button asChild className="rounded-full md:hidden" size="sm">
            <Link href="/alojamientos">Reservar</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
