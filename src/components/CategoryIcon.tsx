import {
  Book,
  Briefcase,
  Bus,
  Car,
  Cat,
  Circle,
  CircleEllipsis,
  CirclePlus,
  Coffee,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Pizza,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Tv,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  Zap,
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
  book: Book,
  bus: Bus,
  cat: Cat,
  coffee: Coffee,
  dumbbell: Dumbbell,
  film: Film,
  'hand-coins': HandCoins,
  landmark: Landmark,
  pizza: Pizza,
  'piggy-bank': PiggyBank,
  plane: Plane,
  'shopping-bag': ShoppingBag,
  smartphone: Smartphone,
  stethoscope: Stethoscope,
  tv: Tv,
  wallet: Wallet,
  wifi: Wifi,
  wine: Wine,
  wrench: Wrench,
  zap: Zap,
};

export const CATEGORY_ICON_NAMES = Object.keys(MAP);

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
