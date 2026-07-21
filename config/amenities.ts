import type {
  AmenityDefinition,
  BuiltInAmenityKey,
} from "@/types/amenity";

export const amenityCatalog = {
  "combined-access": {
    key: "combined-access",
    icon: "home",
    label: {
      es: "Acceso a ambos alojamientos",
      en: "Access to both accommodations",
    },
  },
  "dining-indoor-areas": {
    key: "dining-indoor-areas",
    icon: "utensils",
    label: {
      es: "Comedor y áreas interiores funcionales",
      en: "Dining and functional indoor areas",
    },
  },
  "drip-coffee-maker": {
    key: "drip-coffee-maker",
    icon: "coffee",
    label: {
      es: "Cafetera de filtro",
      en: "Drip coffee maker",
    },
  },
  "family-groups": {
    key: "family-groups",
    icon: "users",
    label: {
      es: "Ideal para familias o grupos pequeños",
      en: "Ideal for families or small groups",
    },
  },
  "fiber-wifi": {
    key: "fiber-wifi",
    icon: "wifi",
    label: {
      es: "WiFi de fibra óptica 100 Mbps",
      en: "100 Mbps fiber optic WiFi",
    },
  },
  "free-street-parking": {
    key: "free-street-parking",
    icon: "car",
    label: {
      es: "Estacionamiento gratuito en la calle",
      en: "Free street parking",
    },
  },
  "full-bathrooms": {
    key: "full-bathrooms",
    icon: "bath",
    label: {
      es: "Baños completos",
      en: "Full bathrooms",
    },
  },
  "full-kitchen": {
    key: "full-kitchen",
    icon: "chefHat",
    label: {
      es: "Cocina completa",
      en: "Full kitchen",
    },
  },
  "gas-stove-oven": {
    key: "gas-stove-oven",
    icon: "flame",
    label: {
      es: "Estufa de gas con horno",
      en: "Gas stove with oven",
    },
  },
  "hot-water": {
    key: "hot-water",
    icon: "showerHead",
    label: {
      es: "Agua caliente",
      en: "Hot water",
    },
  },
  "independent-bedrooms": {
    key: "independent-bedrooms",
    icon: "bed",
    label: {
      es: "Dormitorios independientes",
      en: "Independent bedrooms",
    },
  },
  refrigerator: {
    key: "refrigerator",
    icon: "refrigerator",
    label: {
      es: "Refrigerador",
      en: "Refrigerator",
    },
  },
  "bed-linens": {
    key: "bed-linens",
    icon: "bed",
    label: {
      es: "Ropa de cama",
      en: "Bed linens",
    },
  },
  "portable-fans": {
    key: "portable-fans",
    icon: "fan",
    label: {
      es: "Ventiladores portátiles",
      en: "Portable fans",
    },
  },
  "safe-box": {
    key: "safe-box",
    icon: "shieldCheck",
    label: {
      es: "Caja fuerte",
      en: "Safe box",
    },
  },
  "exercise-equipment": {
    key: "exercise-equipment",
    icon: "dumbbell",
    label: {
      es: "Equipo para hacer ejercicio",
      en: "Exercise equipment",
    },
  },
  "shared-patio": {
    key: "shared-patio",
    icon: "treePalm",
    label: {
      es: "Patio compartido",
      en: "Shared patio",
    },
  },
  "luggage-drop-off": {
    key: "luggage-drop-off",
    icon: "briefcase",
    label: {
      es: "Se permite dejar el equipaje",
      en: "Luggage drop-off allowed",
    },
  },
} as const satisfies Record<BuiltInAmenityKey, AmenityDefinition>;

export function getAmenityByKey(key: BuiltInAmenityKey) {
  return amenityCatalog[key];
}
