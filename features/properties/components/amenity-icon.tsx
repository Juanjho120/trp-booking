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
  ShieldCheck,
  ShowerHead,
  TreePalm,
  Utensils,
  Users,
  Wifi,
} from "lucide-react";

import type { AmenityIconName } from "@/types/amenity";

type AmenityIconProps = Readonly<{
  name: AmenityIconName;
  className?: string;
}>;

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
} satisfies Record<AmenityIconName, typeof Bath>;

export function AmenityIcon({ className, name }: AmenityIconProps) {
  const Icon = amenityIcons[name];

  return <Icon aria-hidden="true" className={className} />;
}
