// ? utils.ts — created to fix import error from interactive-grid-pattern.tsx

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// ? merges conditional classNames & Tailwind utilities safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
