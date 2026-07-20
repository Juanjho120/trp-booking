"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";
import {
  BedDouble,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { LocaleSwitcher, useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/admin",
    key: "dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/reservations",
    key: "reservations",
    icon: BedDouble,
  },
  {
    href: "/admin/payments",
    key: "payments",
    icon: CreditCard,
  },
  {
    href: "/admin/calendar",
    key: "calendar",
    icon: CalendarDays,
  },
  {
    href: "/admin/accommodations",
    key: "accommodations",
    icon: Home,
  },
] as const;

type AdminShellProps = Readonly<{
  adminName: string;
  adminEmail: string | null;
  children: ReactNode;
}>;

function isNavigationItemActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({
  adminName,
  adminEmail,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] = useState<Readonly<{
    fromPathname: string;
    href: string;
  }> | null>(null);
  const { messages } = useLocale();
  const copy = messages.admin.navigation;
  const optimisticPathname =
    pendingNavigation?.fromPathname === pathname
      ? pendingNavigation.href
      : pathname;

  function NavigationLinks({ mobile = false }: Readonly<{ mobile?: boolean }>) {
    return (
      <nav aria-label={copy.ariaLabel} className="grid gap-1.5">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(
            optimisticPathname,
            item.href,
          );
          const label = copy.items[item.key];
          const link = (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              href={item.href}
              onClick={(event) => {
                if (
                  event.button === 0 &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey
                ) {
                  setPendingNavigation({
                    fromPathname: pathname,
                    href: item.href,
                  });
                }
              }}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span>{label}</span>
            </Link>
          );

          return mobile ? (
            <SheetClose asChild key={item.href}>
              {link}
            </SheetClose>
          ) : (
            <div key={item.href}>{link}</div>
          );
        })}
      </nav>
    );
  }

  function AccountActions() {
    return (
      <div className="grid gap-3">
        <div className="rounded-2xl border border-border bg-muted/30 p-3">
          <p className="truncate text-sm font-medium text-foreground">{adminName}</p>
          {adminEmail ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{adminEmail}</p>
          ) : null}
        </div>
        <Button asChild className="justify-start rounded-2xl" variant="outline">
          <Link href="/">
            <ExternalLink aria-hidden="true" />
            {copy.publicSite}
          </Link>
        </Button>
        <Button
          className="justify-start rounded-2xl"
          onClick={() => {
            void signOut({ redirectTo: "/" });
          }}
          type="button"
          variant="secondary"
        >
          <LogOut aria-hidden="true" />
          {copy.signOut}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-background p-5 lg:flex">
        <Link className="flex items-center gap-3" href="/admin">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            <BrandMark alt="" className="w-11" sizes="44px" width={44} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{copy.brandLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {siteConfig.internalName}
            </p>
          </div>
        </Link>
        <div className="mt-8">
          <NavigationLinks />
        </div>
        <div className="mt-auto">
          <AccountActions />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    aria-label={copy.openMenu}
                    className="lg:hidden"
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Menu aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  closeLabel={copy.closeMenu}
                  className="p-0"
                  side="left"
                >
                  <SheetHeader>
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
                        <BrandMark alt="" className="w-10" sizes="40px" width={40} />
                      </span>
                      <div className="min-w-0 text-left">
                        <SheetTitle>{copy.brandLabel}</SheetTitle>
                        <SheetDescription>{siteConfig.internalName}</SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5">
                    <NavigationLinks mobile />
                    <div className="mt-auto">
                      <AccountActions />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2 lg:hidden">
                <BrandMark alt="" className="w-8" sizes="32px" width={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{copy.brandLabel}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {siteConfig.internalName}
                  </p>
                </div>
              </div>
            </div>
            <LocaleSwitcher />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
