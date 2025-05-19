import { execSync } from "child_process";

export function checkOllamaInstalled(): boolean {
  try {
    execSync("ollama --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function generateCompletion(model: string, prompt: string) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.response || data.completion || JSON.stringify(data, null, 2);
}
