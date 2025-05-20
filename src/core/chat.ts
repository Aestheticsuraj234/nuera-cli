import inquirer from "inquirer";
import chalk from "chalk";
import { generateCompletion, generateCompletionStream } from "../services/ollama";
import { saveConversation } from "../utils/history";
import { isCode, formatCode } from "../utils/formatter";
import { createSpinner } from "../utils/spinner";
import { saveCodeToFile } from "../utils/fileUtils";
import { highlight } from "cli-highlight";
import { ChromaService } from "../services/chroma";
import { formatContextForPrompt } from "../utils/context";

const chromaService = ChromaService.getInstance();

export function buildFullPrompt(
  history: { prompt: string; response: string }[],
  newPrompt: string,
  context: string = ""
) {
  const recent = history.slice(-3);
  let promptText = "";
  
  if (context) {
    promptText += context + "\n\n";
  }
  
  for (const pair of recent) {
    promptText += `User: ${pair.prompt}\nAI: ${pair.response}\n`;
  }
  promptText += `User: ${newPrompt}\nAI:`;
  return promptText;
}

export async function chatLoop(
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
    // Get relevant context from ChromaDB
    const contexts = await chromaService.searchContext(prompt);
    const contextText = formatContextForPrompt(contexts);
    
    const fullPrompt = buildFullPrompt(conversationHistory, prompt, contextText);
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