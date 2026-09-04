import volt from "@/assets/starter-volt.png";
import aqua from "@/assets/starter-aqua.png";
import ember from "@/assets/starter-ember.png";
import ball from "@/assets/item-ball.png";
import avatarDefault from "@/assets/avatar-default.png";
import hero from "@/assets/hero-idol.png";
import { cn } from "@/lib/utils";

const SPRITES: Record<string, string> = {
  volt,
  aqua,
  ember,
  ball,
  default: avatarDefault,
  hero,
  potion: ball,
  stone: ball,
  token: ball,
  candy: ball,
  charm: ball,
  egg: ball,
  banner: ball,
  card: ball,
  frame: ball,
};

export function spriteSrc(key: string | null | undefined): string {
  return SPRITES[key ?? "default"] ?? SPRITES["default"]!;
}

export function Sprite({
  name,
  alt,
  className,
}: {
  name: string | null | undefined;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={spriteSrc(name)}
      alt={alt}
      loading="lazy"
      className={cn("object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]", className)}
    />
  );
}
