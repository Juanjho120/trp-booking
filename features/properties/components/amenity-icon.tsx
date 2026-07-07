import type { LucideIcon } from "lucide-react";
import {
  Bath,
  Bed,
  Briefcase,
  Car,
  ChefHat,
  Coffee,
  Dumbbell,
  Fan,
  Flame,
  Home,
  Refrigerator,
  ShowerHead,
  TreePalm,
  Utensils,
  ShieldCheck,
  Wifi,
  Users,
} from "lucide-react";

import type { AmenityIconName } from "@/types/amenity";

const amenityIcons = {
  bath: Bath,
  bed: Bed,
  briefcase: Briefcase,
  car: Car,
  chefHat: ChefHat,
  coffee: Coffee,
  dumbbell: Dumbbell,
  fan: Fan,
  flame: Flame,
  home: Home,
  refrigerator: Refrigerator,
  showerHead: ShowerHead,
  treePalm: TreePalm,
  utensils: Utensils,
  shieldCheck: ShieldCheck,
  wifi: Wifi,
  users: Users,
} as const satisfies Record<AmenityIconName, LucideIcon>;

type AmenityIconProps = Readonly<{
  icon: AmenityIconName;
}>;

export function AmenityIcon({ icon }: AmenityIconProps) {
  const Icon = amenityIcons[icon];

  return <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />;
}
