import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export const generateRandomPercentage = () => Math.floor(Math.random() * 100)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const generateDefaultAutomations = () => {
  return Array.from({ length: 5 }, (_, i) => ({
    id: Date.now().toString() + i,
    name: `Automation ${i + 1}`,
    urls: Array.from({ length: 3 }, (_, j) => ({
      name: `URL ${j + 1}`,
      url: `https://auto-generated.com/${i}-${j}`,
      percentage: generateRandomPercentage()
    }))
  }))
}