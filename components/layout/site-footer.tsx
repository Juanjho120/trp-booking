import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { esMessages } from "@/messages";

const messages = esMessages;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/60" id="contacto">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-foreground">{siteConfig.publicName}</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {messages.footer.description}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">{messages.footer.navigationTitle}</p>
            <div className="mt-3 flex flex-col gap-2">
              {messages.navigation.items.map((link) => (
                <Link
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">{messages.footer.contactTitle}</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <a className="transition hover:text-foreground" href={`mailto:${siteConfig.emails.reservationsEs}`}>
                {siteConfig.emails.reservationsEs}
              </a>
              <a className="transition hover:text-foreground" href={`mailto:${siteConfig.emails.reservationsEn}`}>
                {siteConfig.emails.reservationsEn}
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.brandName}. {messages.footer.rights}
          </p>
          <p>
            {messages.footer.poweredBy} {siteConfig.internalName}.
          </p>
        </div>
      </div>
    </footer>
  );
}
