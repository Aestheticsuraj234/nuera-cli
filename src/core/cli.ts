#!/usr/bin/env bun
import inquirer from "inquirer";
import chalk from "chalk";
import { checkOllamaInstalled, listModels } from "../services/ollama";
import { loadHistory } from "../utils/history";
import { MODELS } from "../config/config";
import { chatLoop } from "./chat";

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

  await chatLoop(model, useStreaming, conversationHistory);
}

main().catch((err) => {
  console.error(chalk.red("\u274C Unexpected error:"), err);
}); 