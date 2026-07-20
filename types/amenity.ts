export const amenityKeys = [
  "combined-access",
  "dining-indoor-areas",
  "drip-coffee-maker",
  "family-groups",
  "fiber-wifi",
  "free-street-parking",
  "full-bathrooms",
  "full-kitchen",
  "gas-stove-oven",
  "hot-water",
  "independent-bedrooms",
  "refrigerator",
  "bed-linens",
  "portable-fans",
  "safe-box",
  "exercise-equipment",
  "shared-patio",
  "luggage-drop-off",
] as const;

export type AmenityKey = (typeof amenityKeys)[number];

export const amenityIconNames = [
  "bath",
  "bed",
  "briefcase",
  "car",
  "chefHat",
  "coffee",
  "dumbbell",
  "fan",
  "flame",
  "home",
  "refrigerator",
  "showerHead",
  "treePalm",
  "utensils",
  "shieldCheck",
  "wifi",
  "users",
] as const;

export type AmenityIconName = (typeof amenityIconNames)[number];

export type AmenityDefinition = Readonly<{
  key: AmenityKey;
  icon: AmenityIconName;
  label: Readonly<{
    es: string;
    en: string;
  }>;
}>;
