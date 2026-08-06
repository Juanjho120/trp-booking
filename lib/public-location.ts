import { prisma } from "@/lib/db/prisma";
import {
  normalizePublicLocationMapEmbedUrl,
  PublicLocationMapUrlError,
} from "@/lib/public-location-map";
import type { PublicLocationSettings } from "@/types/public-location";

export const PUBLIC_LOCATION_SETTINGS_ID = "site";

export async function getPublicLocationSettings(): Promise<PublicLocationSettings | null> {
  const settings = await prisma.publicLocationSettings.findUnique({
    where: { id: PUBLIC_LOCATION_SETTINGS_ID },
    select: {
      enabled: true,
      publicLocationEs: true,
      publicLocationEn: true,
      mapEmbedUrl: true,
    },
  });

  const publicLocationEs = settings?.publicLocationEs?.trim() ?? "";
  const publicLocationEn = settings?.publicLocationEn?.trim() ?? "";
  const persistedMapEmbedUrl = settings?.mapEmbedUrl?.trim() ?? "";

  if (
    !settings?.enabled ||
    !publicLocationEs ||
    !publicLocationEn ||
    !persistedMapEmbedUrl
  ) {
    return null;
  }

  try {
    return {
      publicLocationEs,
      publicLocationEn,
      mapEmbedUrl: normalizePublicLocationMapEmbedUrl(persistedMapEmbedUrl),
    };
  } catch (error) {
    if (error instanceof PublicLocationMapUrlError) {
      return null;
    }

    throw error;
  }
}
