import ora from "ora";

export function createSpinner() {
  const spinner = ora();
  const interval = setInterval(() => {
    spinner.text = "\u{1F916} Thinking...";
  }, 1000);
  return { spinner, interval };
} 