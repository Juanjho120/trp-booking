import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  Home,
  ImageIcon,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { signOut } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { esMessages } from "@/messages";

const messages = esMessages;

const adminModuleIcons = [
  Home,
  CalendarDays,
  CreditCard,
  ImageIcon,
  Mail,
  ShieldCheck,
] as const;

type MinimalAdminShellProps = Readonly<{
  adminName: string;
  adminEmail: string | null;
}>;

async function signOutFromAdmin() {
  "use server";

  await signOut({ redirectTo: "/" });
}

export function MinimalAdminShell({ adminName, adminEmail }: MinimalAdminShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
              TRP
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {messages.admin.shell.brandLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {siteConfig.internalName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="rounded-full" variant="outline">
              <Link href="/">{messages.admin.shell.viewPublicSite}</Link>
            </Button>
            <form action={signOutFromAdmin}>
              <Button className="rounded-full" type="submit" variant="secondary">
                <LogOut aria-hidden="true" />
                {messages.admin.shell.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_32rem)] py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Badge className="rounded-full" variant="secondary">
              {messages.admin.shell.badge}
            </Badge>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
              <div className="max-w-3xl">
                <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  {messages.admin.shell.title}
                </h1>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  {messages.admin.shell.description}
                </p>
              </div>

              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>{messages.admin.shell.sessionCard.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.admin.shell.sessionCard.signedInAs}
                    </p>
                    <p className="mt-1 text-base font-medium text-foreground">
                      {adminName}
                    </p>
                    {adminEmail ? (
                      <p className="mt-1 text-sm text-muted-foreground">{adminEmail}</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
                    {messages.admin.shell.sessionCard.protectionNote}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3 lg:px-8">
            {messages.admin.shell.modules.map((module, index) => {
              const ModuleIcon = adminModuleIcons[index] ?? ShieldCheck;

              return (
                <Card
                  className="border-border/70 bg-card shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  key={module.title}
                >
                  <CardHeader>
                    <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ModuleIcon aria-hidden="true" className="size-5" />
                    </div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <CardTitle>{module.title}</CardTitle>
                      <Badge variant="outline">{module.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Card className="border-border/70 bg-muted/35 shadow-sm">
              <CardHeader>
                <CardTitle>{messages.admin.shell.guardrails.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {messages.admin.shell.guardrails.items.map((item) => (
                    <div
                      className="rounded-3xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground"
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
