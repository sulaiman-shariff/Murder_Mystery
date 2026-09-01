import type { Mystery } from "@/types";
import { room314 } from "./mysteries/room-314";
import { vaughnStreet } from "./mysteries/vaughn-street";
import { northoltPress } from "./mysteries/northolt-press";

const mysteries: Mystery[] = [room314, vaughnStreet, northoltPress];

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
