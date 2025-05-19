#!/usr/bin/env bun
import inquirer from "inquirer";
import chalk from "chalk";
import { checkOllamaInstalled, generateCompletion } from "./ollama";
import { saveConversation } from "./history";
import { isCode, formatCode } from "./formatter";
import { createSpinner } from "./spinner";
import { saveCodeToFile } from "./fileUtils";
import { MODELS } from "./config";

async function main() {
  console.log(chalk.cyanBright("🚀 Welcome to Neura CLI - Your AI coding companion\n"));

  if (!checkOllamaInstalled()) {
    console.log(chalk.red("❌ Ollama CLI not found. Please install Ollama first: https://ollama.com"));
    process.exit(1);
  }

  const { model } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Select which model to use:",
      choices: MODELS,
    },
  ]);

  const { prompt } = await inquirer.prompt([
    {
      type: "input",
      name: "prompt",
      message: "💡 What would you like to generate?",
    },
  ]);

  const { spinner, interval } = createSpinner();

  try {
    const response = await generateCompletion(model, prompt);
    clearInterval(interval);
    spinner.succeed("✅ Response generated!");

    if (isCode(response)) {
      const formatted = formatCode(response);
      console.log(chalk.greenBright("\n--- AI Code Response ---\n"));
      console.log(chalk.white(formatted));
      console.log(chalk.greenBright("\n-----------------------\n"));

      const { save } = await inquirer.prompt([
        {
          type: "confirm",
          name: "save",
          message: "Do you want to save the code to a file?",
          default: false,
        },
      ]);

      if (save) {
        const { filename } = await inquirer.prompt([
          {
            type: "input",
            name: "filename",
            message: "Enter filename (e.g. snippet.md):",
            validate: (input) => input.trim() !== "" || "Filename cannot be empty",
          },
        ]);

        const saved = saveCodeToFile(formatted, filename);
        if (saved) {
          console.log(chalk.greenBright(`✅ Code saved to ${filename}`));
        } else {
          console.log(chalk.red("❌ Failed to save the file"));
        }
      }
    } else {
      console.log(chalk.greenBright("\n--- AI Response ---\n"));
      console.log(chalk.white(response));
      console.log(chalk.greenBright("\n-------------------\n"));
    }

    saveConversation(prompt, response);
  } catch (err) {
    clearInterval(interval);
    spinner.fail("❌ Failed to generate response");
    console.error(chalk.red(err));
  }
}

main().catch((err) => {
  console.error(chalk.red("❌ Unexpected error:"), err);
});
