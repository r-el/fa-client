import type { ComponentType } from "react";
import { Car, Luggage, PawPrint, User } from "lucide-react";

export interface DetectionCategory {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  items: readonly string[];
}

export const DETECTION_CATEGORIES: readonly DetectionCategory[] = [
  { id: "people", label: "People", icon: User, items: ["person"] },
  { id: "vehicles", label: "Vehicles", icon: Car, items: ["car", "truck", "bus", "motorcycle", "bicycle"] },
  { id: "bags", label: "Bags & Luggage", icon: Luggage, items: ["backpack", "handbag", "suitcase"] },
  { id: "animals", label: "Animals", icon: PawPrint, items: ["dog", "cat", "horse", "sheep", "cow"] },
];

export function parseClassesList(classesString: string): string[] {
  return classesString.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
}

export function isCategorySelected(classesString: string, categoryItems: readonly string[]): boolean {
  const current = parseClassesList(classesString);
  return categoryItems.length > 0 && categoryItems.every((item) => current.includes(item));
}

export function toggleCategoryClasses(classesString: string, categoryItems: readonly string[]): string {
  const current = parseClassesList(classesString);
  const isSelected = categoryItems.every((item) => current.includes(item));
  let updated = [...current];

  if (isSelected) {
    updated = updated.filter((item) => !categoryItems.includes(item));
  } else {
    categoryItems.forEach((item) => {
      if (!updated.includes(item)) updated.push(item);
    });
  }

  return updated.join(", ");
}
