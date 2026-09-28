import { type PrismaClient } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import {
  getPublicCacheEnvironmentScope,
  getPublicCacheKeyParts,
  getPublicCacheTag,
  PUBLIC_CACHE_DOMAINS,
  PUBLIC_CACHE_REVALIDATE_SECONDS,
} from "@/lib/public-cache";
import {
  normalizePublicLocationMapEmbedUrl,
  PublicLocationMapUrlError,
} from "@/lib/public-location-map";
import type { PublicLocationSettings } from "@/types/public-location";

export const PUBLIC_LOCATION_SETTINGS_ID = "site";

type PublicLocationQueryOptions = Readonly<{
  prismaClient?: Pick<PrismaClient, "publicLocationSettings">;
}>;

export async function getPublicLocationSettingsRaw(
  options: PublicLocationQueryOptions = {},
): Promise<PublicLocationSettings | null> {
  const prismaClient = options.prismaClient ?? prisma;
  const settings = await prismaClient.publicLocationSettings.findUnique({
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

const getCachedPublicLocationSettings = unstable_cache(
  async (environmentScope: string) => {
    void environmentScope;

    return getPublicLocationSettingsRaw({ prismaClient: prisma });
  },
  [...getPublicCacheKeyParts(PUBLIC_CACHE_DOMAINS.location, "settings")],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [getPublicCacheTag(PUBLIC_CACHE_DOMAINS.location)],
  },
);

export async function getPublicLocationSettings(
  options: PublicLocationQueryOptions = {},
): Promise<PublicLocationSettings | null> {
  if (options.prismaClient) {
    return getPublicLocationSettingsRaw(options);
  }

  return getCachedPublicLocationSettings(getPublicCacheEnvironmentScope());
}
