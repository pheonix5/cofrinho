import {
  Briefcase,
  Car,
  CircleEllipsis,
  CirclePlus,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Repeat,
  ShoppingCart,
  TrendingUp,
  Utensils,
  Circle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

const MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  'gamepad-2': Gamepad2,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'shopping-cart': ShoppingCart,
  repeat: Repeat,
  'circle-ellipsis': CircleEllipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  gift: Gift,
  'circle-plus': CirclePlus,
  circle: Circle,
};

export function CategoryIcon({
  name,
  size = 18,
  color = '#FFFFFF',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const Icon = MAP[name] ?? Circle;
  return <Icon size={size} color={color} strokeWidth={2.2} />;
}
