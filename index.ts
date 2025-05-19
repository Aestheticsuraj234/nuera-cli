#!/usr/bin/env bun
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";

async function askAndGenerate() {
  const { model } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Select which model to use:",
      choices: [
        { name: "DeepSeek (deepseek-r1:latest)", value: "deepseek-r1:latest" },
        { name: "Qwen 3 (qwen3:8b)", value: "qwen3:8b" },
        { name: "CodeLlama (codellama:latest)", value: "codellama:latest" },
      ],
    },
  ]);

  // You can store the conversation history here if your API supports it
  const conversationHistory: { role: string; content: string }[] = [];

  while (true) {
    const { prompt } = await inquirer.prompt([
      {
        type: "input",
        name: "prompt",
        message: "💡 What would you like to generate? (type 'exit' to quit)",
      },
    ]);

    if (prompt.trim().toLowerCase() === "exit") {
      console.log(chalk.yellow("👋 Exiting Neura CLI. Goodbye!"));
      process.exit(0);
    }

    conversationHistory.push({ role: "user", content: prompt });

    const thinkingMessages = [
      "🤖 Analyzing your prompt...",
      "🧠 Deep in thought...",
      "⏳ Crunching some data...",
      "⚙️ Fine-tuning the model...",
      "💡 Almost there...",
    ];

    const spinner = ora(thinkingMessages[0]).start();
    let lastIndex = 0;

    const interval = setInterval(() => {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * thinkingMessages.length);
      } while (randomIndex === lastIndex);

      lastIndex = randomIndex;
      spinner.text = thinkingMessages[randomIndex];
    }, 3000);

    try {
      // Send conversationHistory if your backend supports context
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          // conversationHistory,  // Uncomment if backend supports this
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        spinner.fail(`API error: ${res.status} ${res.statusText}`);
        continue; // allow user to try again
      }

      spinner.text = "✅ Response generated!";
      spinner.succeed();

      const data = await res.json();
      const text = data.response || data.completion || JSON.stringify(data, null, 2);

      conversationHistory.push({ role: "assistant", content: text });

      // Detect code heuristic
      const isCode = text.includes("function") || text.includes("const ") || text.includes("{") || text.includes("}");

      if (isCode) {
        console.log(chalk.greenBright("\n--- AI Code Response ---\n"));
        console.log(chalk.white(text));
        console.log(chalk.greenBright("\n-------------------\n"));
      } else {
        console.log(chalk.greenBright("\n--- AI Response ---\n"));
        console.log(chalk.white(text));
        console.log(chalk.greenBright("\n-------------------\n"));
      }
    } catch (err) {
      clearInterval(interval);
      spinner.fail("❌ Failed to generate response");
      console.error(chalk.red(err));
    }
  }
}

async function main() {
  console.log(chalk.cyanBright("🚀 Welcome to Neura CLI - Your AI coding companion\n"));
  await askAndGenerate();
}

main().catch((err) => {
  console.error(chalk.red("❌ Unexpected error:"), err);
});
