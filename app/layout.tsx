import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { esMessages } from "@/messages";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: esMessages.seo.home.title,
    template: "%s",
  },
  description: esMessages.seo.home.description,
  applicationName: siteConfig.internalName,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "Panajachel",
    "Lake Atitlán",
    "Lago de Atitlán",
    "bungalows",
    "alojamientos en Panajachel",
    "direct booking Guatemala",
    "Tu Refugio Perfecto",
  ],
  authors: [{ name: siteConfig.publicName, url: siteConfig.url }],
  creator: siteConfig.publicName,
  publisher: siteConfig.publicName,
  alternates: {
    canonical: siteConfig.url,
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body
        className={cn(
          inter.variable,
          geistMono.variable,
          "min-h-screen bg-background font-sans antialiased",
        )}
      >
        {children}
      </body>
    </html>
  );
}
