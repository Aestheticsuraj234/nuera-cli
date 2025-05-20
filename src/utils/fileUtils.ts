import { writeFileSync } from "fs";

export function saveCodeToFile(code: string, filename: string): boolean {
  try {
    writeFileSync(filename, code);
    return true;
  } catch (err) {
    console.error("Failed to save file:", err);
    return false;
  }
} 