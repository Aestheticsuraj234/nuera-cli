import { spawnSync, spawn } from "child_process";
import inquirer from "inquirer";

// ✅ Check if Ollama CLI is installed
export function checkOllamaInstalled(): boolean {
  const result = spawnSync("ollama", ["--version"], { encoding: "utf-8" });
  return result.status === 0;
}

// ✅ Get list of all available models from Ollama
export async function listModels(): Promise<string[]> {
  const res = await fetch("http://localhost:11434/api/tags");
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.models.map((m: any) => m.name);
}

// ✅ Check if a given model is available locally
export async function isModelAvailable(model: string): Promise<boolean> {
  try {
    const availableModels = await listModels();
    return availableModels.includes(model);
  } catch (err) {
    console.error("Failed to fetch model list:", err);
    return false;
  }
}

// ✅ Prompt user to install a model if it's not available
export async function promptToInstallModel(model: string): Promise<void> {
  const { install } = await inquirer.prompt([
    {
      type: "confirm",
      name: "install",
      message: `The model "${model}" is not installed. Do you want to download it now?`,
      default: true,
    },
  ]);

  if (!install) {
    console.log("Model installation cancelled. Exiting.");
    process.exit(1);
  }

  console.log(`⬇️ Downloading "${model}"...`);
  const child = spawn("ollama", ["pull", model], { stdio: "inherit" });

  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ Successfully installed "${model}"`);
        resolve();
      } else {
        reject(new Error(`Failed to install model "${model}" (exit code ${code})`));
      }
    });
  });
}

// ✅ Generate a full (non-streaming) completion
export async function generateCompletion(
  model: string,
  prompt: string,
  stream: boolean = false
): Promise<any> {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  if (!stream) {
    return res.json();
  }

  return res.body;
}

// ✅ Streamed completion using async generator
export async function* generateCompletionStream(model: string, prompt: string) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error("No response body from Ollama API");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");

    // Process all complete lines except the last which might be partial
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const json = JSON.parse(line);
        if (json.response) {
          yield json.response;
        }
      } catch {
        // Ignore JSON parse errors (likely partial lines)
      }
    }

    buffer = lines[lines.length - 1]; // keep partial line
  }
}
