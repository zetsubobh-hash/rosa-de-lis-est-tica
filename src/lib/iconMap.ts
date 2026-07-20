import {
  Droplets, Snowflake, Syringe, Wind, Gem, CircleDot,
  HandMetal, Waves, Sun, Sparkles, Zap, ShieldCheck,
  Heart, Star, Flower2, Scissors, Eye, Smile,
  Bath, Brush, Candy, Crown, Diamond, Feather, Flame, Flower,
  Glasses, Hand, HandHeart, Leaf, LeafyGreen, Moon, Paintbrush,
  Paintbrush2, Pill, PillBottle, Ribbon, ScissorsLineDashed,
  ScanFace, Shell, SmilePlus, SprayCan, SunDim, Sunrise,
  Thermometer, ThermometerSnowflake, User, Users, Bandage,
  HeartPulse, Stethoscope, Apple, Baby,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Droplets, Snowflake, Syringe, Wind, Gem, CircleDot,
  HandMetal, Waves, Sun, Sparkles, Zap, ShieldCheck,
  Heart, Star, Flower2, Scissors, Eye, Smile,
  Bath, Brush, Candy, Crown, Diamond, Feather, Flame, Flower,
  Glasses, Hand, HandHeart, Leaf, LeafyGreen, Moon, Paintbrush,
  Paintbrush2, Pill, PillBottle, Ribbon, ScissorsLineDashed,
  ScanFace, Shell, SmilePlus, SprayCan, SunDim, Sunrise,
  Thermometer, ThermometerSnowflake, User, Users, Bandage,
  HeartPulse, Stethoscope, Apple, Baby,
};

export const getIconByName = (name: string): LucideIcon => {
  return iconMap[name] || Sparkles;
};
