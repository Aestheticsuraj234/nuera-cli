import type { Metadata } from "chromadb";

export interface ContextResult {
  content: string;
  metadata: Metadata;
}

export function formatContextForPrompt(contexts: ContextResult[]): string {
  if (!contexts || contexts.length === 0) {
    return "";
  }

  return contexts
    .map((ctx) => {
      const path = ctx.metadata.path || "unknown";
      const type = ctx.metadata.type || "unknown";
      const lastModified = ctx.metadata.lastModified || "unknown";
      return `File: ${path} (${type}, last modified: ${lastModified})\n${ctx.content}`;
    })
    .join("\n\n");
} 