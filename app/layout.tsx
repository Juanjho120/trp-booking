import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { esMessages } from "@/messages";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: esMessages.seo.home.title,
    template: `%s`,
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
    <html lang="es-GT">
      <body className={cn(inter.variable, geistSans.variable, geistMono.variable, "antialiased")}>
        {children}
      </body>
    </html>
  );
}
