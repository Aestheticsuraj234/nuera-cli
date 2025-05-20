import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const HISTORY_FILE = join(process.cwd(), ".chat_history.json");

export function saveConversation(prompt: string, response: string) {
  const history = loadHistory();
  history.push({ prompt, response });
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function loadHistory(): { prompt: string; response: string }[] {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
} 