import ora from "ora";
import { THINKING_MESSAGES } from "./config";

export function createSpinner() {
  let index = 0;
  const spinner = ora(THINKING_MESSAGES[index]).start();

  const interval = setInterval(() => {
    index = (index + 1) % THINKING_MESSAGES.length;
    spinner.text = THINKING_MESSAGES[index];
  }, 3000);

  return { spinner, interval };
}
