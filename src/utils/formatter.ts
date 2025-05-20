export function isCode(text: string): boolean {
  return text.includes("```") || text.includes("function") || text.includes("class");
}

export function formatCode(code: string): string {
  // Remove markdown code block markers if present
  return code.replace(/```typescript\n?|\n?```/g, "").trim();
} 