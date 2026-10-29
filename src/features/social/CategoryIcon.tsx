import {
  Music2,
  Dices,
  Utensils,
  Palette,
  Compass,
  MessagesSquare,
  type LucideProps,
} from "lucide-react";
export function CategoryIcon({ category, ...props }: LucideProps & { category: string }) {
  const Icon =
    category === "dance"
      ? Music2
      : category === "games"
        ? Dices
        : category === "food"
          ? Utensils
          : category === "art"
            ? Palette
            : category === "outdoors"
              ? Compass
              : MessagesSquare;
  return <Icon {...props} />;
}
