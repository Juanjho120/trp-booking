import type { Metadata } from "next";

import { AccommodationsPage } from "@/features/properties";

export const metadata: Metadata = {
  title: "Alojamientos | Tu Refugio Perfecto",
  description:
    "Explora los alojamientos disponibles de Tu Refugio Perfecto en Panajachel, Guatemala.",
};

export default function Page() {
  return <AccommodationsPage />;
}
