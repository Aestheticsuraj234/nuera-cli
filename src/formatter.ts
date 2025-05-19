export function isCode(text: string): boolean {
  return (
    text.includes("function") ||
    text.includes("const ") ||
    text.includes("{") ||
    text.includes("}")
  );
}

export function formatCode(text: string): string {
  // No prettier - just trim extra spaces for now
  return text.trim();
}
