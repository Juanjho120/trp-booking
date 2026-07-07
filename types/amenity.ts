export type AmenityKey =
  | "combined-access"
  | "dining-indoor-areas"
  | "drip-coffee-maker"
  | "family-groups"
  | "fiber-wifi"
  | "free-street-parking"
  | "full-bathrooms"
  | "full-kitchen"
  | "gas-stove-oven"
  | "hot-water"
  | "independent-bedrooms"
  | "refrigerator"
  | "bed-linens"
  | "portable-fans"
  | "safe-box"
  | "exercise-equipment"
  | "shared-patio"
  | "luggage-drop-off";

export type AmenityIconName =
  | "bath"
  | "bed"
  | "briefcase"
  | "car"
  | "chefHat"
  | "coffee"
  | "dumbbell"
  | "fan"
  | "flame"
  | "home"
  | "refrigerator"
  | "showerHead"
  | "treePalm"
  | "utensils"
  | "shieldCheck"
  | "wifi"
  | "users";

export type AmenityDefinition = Readonly<{
  key: AmenityKey;
  icon: AmenityIconName;
  label: Readonly<{
    es: string;
    en: string;
  }>;
}>;
