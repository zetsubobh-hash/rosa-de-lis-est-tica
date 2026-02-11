import {
  Droplets, Snowflake, Syringe, Wind, Gem, CircleDot,
  HandMetal, Waves, Sun, Sparkles, Zap, ShieldCheck,
  Heart, Star, Flower2, Scissors, Eye, Smile,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Droplets, Snowflake, Syringe, Wind, Gem, CircleDot,
  HandMetal, Waves, Sun, Sparkles, Zap, ShieldCheck,
  Heart, Star, Flower2, Scissors, Eye, Smile,
};

export const getIconByName = (name: string): LucideIcon => {
  return iconMap[name] || Sparkles;
};
