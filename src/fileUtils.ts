import fs from "fs";

export function saveCodeToFile(code: string, filename: string) {
  try {
    fs.writeFileSync(filename, code);
    return true;
  } catch {
    return false;
  }
}
