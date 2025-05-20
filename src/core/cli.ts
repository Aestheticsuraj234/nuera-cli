#!/usr/bin/env bun
import inquirer from "inquirer";
import chalk from "chalk";
import { checkOllamaInstalled, listModels } from "../services/ollama";
import { loadHistory } from "../utils/history";
import { MODELS } from "../config/config";
import { chatLoop } from "./chat";
import { ChromaService } from "../services/chroma";

async function main() {
  console.log(chalk.cyanBright("\u{1F680} Welcome to Neura CLI - Your AI coding companion\n"));

  if (!checkOllamaInstalled()) {
    console.log(chalk.red("\u274C Ollama CLI not found. Please install Ollama first: https://ollama.com"));
    process.exit(1);
  }

  const installedModels = await listModels();
  const availableModels = MODELS.filter((m) => installedModels.includes(m.value));
  if (availableModels.length === 0) {
    console.log(chalk.red("\u274C No supported models installed. Please run `ollama pull <model>` first."));
    process.exit(1);
  }
  // Initialize ChromaDB and index codebase
  const chromaService = ChromaService.getInstance();
  let useRag = false;

  try {
    console.log(chalk.blue("Initializing ChromaDB..."));
    await chromaService.initialize();
    useRag = true;
    
    const { shouldIndex } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldIndex",
        message: "Do you want to index the current codebase for context?",
        default: true,
      },
    ]);

    if (shouldIndex) {
      console.log(chalk.blue("Indexing codebase..."));
      await chromaService.indexCodebase(process.cwd());
      console.log(chalk.green("✅ Codebase indexed successfully!"));
    }
  } catch (error) {
    console.warn(chalk.yellow("\u26A0 ChromaDB initialization failed. Running without RAG support."));
    console.warn(chalk.yellow("To enable RAG, ensure ChromaDB is running with:"));
    console.warn(chalk.yellow("docker run -d --name chroma -p 8000:8000 chromadb/chroma"));
    useRag = false;
  }

  let conversationHistory = loadHistory();

  const { model } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Select which model to use:",
      choices: availableModels,
    },
  ]);

  const { useStreaming } = await inquirer.prompt([
    {
      type: "confirm",
      name: "useStreaming",
      message: "Do you want to stream the response as it's being generated?",
      default: true,
    },
  ]);

  console.log(chalk.gray("Type your prompt below. Type 'exit' or 'quit' to end.\n"));
  if (useRag) {
    console.log(chalk.green("RAG is enabled - your queries will include relevant code context"));
  } else {
    console.log(chalk.yellow("RAG is disabled - responses will not include code context"));
  }

  await chatLoop(model, useStreaming, conversationHistory);
}

main().catch((err) => {
  console.error(chalk.red("\u274C Unexpected error:"), err);
}); 