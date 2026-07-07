import type { Metadata } from "next";

import { createSeoMetadata } from "@/config/seo";
import { HomePage } from "@/features/marketing";
import { esMessages } from "@/messages";

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.home.title,
  description: esMessages.seo.home.description,
  path: "/",
});

export default function Page() {
  return <HomePage />;
}
