
import fs from "fs";
import { HISTORY_FILE } from "./config";

export function saveConversation(prompt: string, response: string) {
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    const data = fs.readFileSync(HISTORY_FILE, "utf-8");
    history = JSON.parse(data);
  }
  history.push({ prompt, response, date: new Date().toISOString() });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const data = fs.readFileSync(HISTORY_FILE, "utf-8");
  return JSON.parse(data);
}
