#!/usr/bin/env bun
import inquirer from "inquirer";
import chalk from "chalk";
import {
  checkOllamaInstalled,
  generateCompletion,
  generateCompletionStream,
  listModels,
} from "./ollama";
import { saveConversation, loadHistory } from "./history";
import { isCode, formatCode } from "./formatter";
import { createSpinner } from "./spinner";
import { saveCodeToFile } from "./fileUtils";
import { MODELS } from "./config";
import { highlight } from "cli-highlight";

function buildFullPrompt(history: { prompt: string; response: string }[], newPrompt: string) {
  const recent = history.slice(-3);
  let context = "";
  for (const pair of recent) {
    context += `User: ${pair.prompt}\nAI: ${pair.response}\n`;
  }
  context += `User: ${newPrompt}\nAI:`;
  return context;
}

async function chatLoop(
  model: string,
  useStreaming: boolean,
  conversationHistory: { prompt: string; response: string }[]
) {
  const { prompt } = await inquirer.prompt([
    {
      type: "input",
      name: "prompt",
      message: chalk.yellow("You:"),
      validate: (input) => (input.trim().length > 0 ? true : "Please enter something"),
    },
  ]);

  if (["exit", "quit"].includes(prompt.toLowerCase().trim())) {
    console.log(chalk.cyan("\u{1F44B} Goodbye!"));
    return;
  }

  const { spinner, interval } = createSpinner();
  spinner.start();

  try {
    const fullPrompt = buildFullPrompt(conversationHistory, prompt);
    let responseText = "";

    if (useStreaming) {
      let buffer = "";
      for await (const chunk of generateCompletionStream(model, fullPrompt)) {
        spinner.text = chunk.trim().slice(-20) || "\u{1F916} Thinking...";
        buffer += chunk;
      }
      clearInterval(interval);
      spinner.succeed("\u2705 Response complete!");
      responseText = buffer;
      console.log(
        isCode(responseText)
          ? highlight(formatCode(responseText), { language: "typescript", ignoreIllegals: true })
          : responseText
      );
    } else {
      const result = await generateCompletion(model, fullPrompt, false);
      responseText = result.response || "";
      clearInterval(interval);
      spinner.succeed("\u2705 Response complete!");
      console.log(
        isCode(responseText)
          ? highlight(formatCode(responseText), { language: "typescript", ignoreIllegals: true })
          : responseText
      );
    }

    conversationHistory.push({ prompt, response: responseText });
    saveConversation(prompt, responseText);

    if (isCode(responseText)) {
      const { save } = await inquirer.prompt([
        {
          type: "confirm",
          name: "save",
          message: "Save this code snippet to a file?",
          default: false,
        },
      ]);
      if (save) {
        const { filename } = await inquirer.prompt([
          {
            type: "input",
            name: "filename",
            message: "Enter filename (e.g. snippet.ts):",
            validate: (input) => input.trim() !== "" || "Filename cannot be empty",
          },
        ]);
        const saved = saveCodeToFile(formatCode(responseText), filename);
        if (saved) {
          console.log(chalk.greenBright(`\u2705 Code saved to ${filename}`));
        } else {
          console.log(chalk.red("\u274C Failed to save the file"));
        }
      }
    }
  } catch (err) {
    clearInterval(interval);
    spinner.fail("\u274C Failed to generate response");
    console.error(chalk.red(err));
  }

  // Recurse to handle the next input
  await chatLoop(model, useStreaming, conversationHistory);
}

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
