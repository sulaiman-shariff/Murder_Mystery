import type { Mystery } from "@/types";
import { gildedRoseMansion } from "./mysteries/gilded-rose-mansion";
import { hollowbrookAsylum } from "./mysteries/hollowbrook-asylum";
import { veilOfEbonmere } from "./mysteries/veil-of-ebonmere";

const mysteries: Mystery[] = [
  gildedRoseMansion,
  hollowbrookAsylum,
  veilOfEbonmere,
];

export function getMysteryById(id: string): Mystery | undefined {
  return mysteries.find((m) => m.id === id);
}

export function getMysteryByOrder(order: number): Mystery | undefined {
  return mysteries.find((m) => m.order === order);
}

export function getAllMysteries(): Mystery[] {
  return mysteries;
}

export function getTotalMysteries(): number {
  return mysteries.length;
}

export { mysteries };
