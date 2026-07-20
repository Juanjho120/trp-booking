import Link from "next/link";

import { BrandLogo } from "@/components/brand";
import { siteConfig } from "@/config/site";
import { esMessages } from "@/messages";

const messages = esMessages;

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-muted/30" id="contacto">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_0.8fr_1fr] lg:px-8">
        <div>
          <BrandLogo
            className="w-36 sm:w-40"
            sizes="(min-width: 640px) 160px, 144px"
            width={160}
          />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            {messages.footer.description}
          </p>
          <p className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            {messages.footer.note}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">
            {messages.footer.navigationTitle}
          </p>
          <div className="mt-4 grid gap-3">
            {messages.navigation.items.map((item) => (
              <Link
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">
            {messages.footer.contactTitle}
          </p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <a
              className="transition-colors hover:text-foreground"
              href={`mailto:${siteConfig.emails.reservationsEs}`}
            >
              {messages.footer.reservationsEmailLabel}: {siteConfig.emails.reservationsEs}
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href={`mailto:${siteConfig.emails.reservationsEn}`}
            >
              {messages.footer.englishEmailLabel}: {siteConfig.emails.reservationsEn}
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href={`mailto:${siteConfig.emails.admin}`}
            >
              {messages.footer.adminEmailLabel}: {siteConfig.emails.admin}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 px-6 py-5 text-center text-xs text-muted-foreground">
        © {currentYear} {siteConfig.brandName}. {messages.footer.rights}
      </div>
    </footer>
  );
}
