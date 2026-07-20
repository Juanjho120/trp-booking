"use client";

import Link from "next/link";
import { LogIn, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocaleSwitcher, useLocale } from "@/features/i18n";

type AdminSignInPageProps = Readonly<{
  signInAction: () => Promise<void>;
}>;

export function AdminSignInPage({ signInAction }: AdminSignInPageProps) {
  const { messages } = useLocale();
  const copy = messages.admin.signIn;

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-x-hidden bg-muted/20 px-4 pb-12 pt-20 sm:items-center sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_34rem),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.08),_transparent_28rem)]"
      />

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LocaleSwitcher />
      </div>

      <Card className="relative z-10 w-full max-w-lg border-border/70 bg-background/95 shadow-xl backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <BrandLogo
            className="mx-auto w-48 sm:w-56"
            priority
            sizes="(min-width: 640px) 224px, 192px"
            width={224}
          />
          <div className="mt-3 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {copy.badge}
          </div>
          <CardTitle className="mt-3 text-2xl sm:text-3xl">{copy.title}</CardTitle>
          <CardDescription className="max-w-md text-sm leading-6">
            {copy.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form action={signInAction}>
            <Button className="h-11 w-full rounded-full" type="submit">
              <LogIn aria-hidden="true" />
              {copy.continueWithGoogle}
            </Button>
          </form>

          <p className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-center text-xs leading-5 text-muted-foreground">
            {copy.accessNote}
          </p>

          <Button asChild className="w-full rounded-full" variant="outline">
            <Link href="/">{copy.backToPublicSite}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
