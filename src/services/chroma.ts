import { ChromaClient, Collection } from "chromadb";
import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const CHROMA_URL = "http://localhost:8000";
const COLLECTION_NAME = "codebase_context";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export class ChromaService {
  private static instance: ChromaService;
  private client: ChromaClient;
  private collection?: Collection;
  private isInitialized: boolean = false;

  private constructor() {
    this.client = new ChromaClient({
      path: CHROMA_URL,
      auth: {
        credentials: "chroma",
        provider: "token"
      }
    });
  }

  public static getInstance(): ChromaService {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService();
    }
    return ChromaService.instance;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initialize() {
    if (this.isInitialized) return;

    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        console.log(`Attempting to connect to ChromaDB (attempt ${retries + 1}/${MAX_RETRIES})...`);
        
        // Create or get collection
        this.collection = await this.client.getOrCreateCollection({
          name: COLLECTION_NAME,
          metadata: { description: "Codebase context for RAG" }
        });
        
        this.isInitialized = true;
        console.log("Successfully connected to ChromaDB!");
        return;
      } catch (error) {
        retries++;
        if (retries === MAX_RETRIES) {
          console.error("Failed to connect to ChromaDB after multiple attempts.");
          console.error("Please ensure ChromaDB is running with: docker run -d --name chroma -p 8000:8000 chromadb/chroma");
          throw error;
        }
        console.log(`Connection failed, retrying in ${RETRY_DELAY/1000} seconds...`);
        await this.wait(RETRY_DELAY);
      }
    }
  }

  async indexCodebase(rootDir: string) {
    if (!this.isInitialized || !this.collection) {
      throw new Error("ChromaDB not initialized. Call initialize() first.");
    }

    const files = this.getAllFiles(rootDir);
    console.log(`Found ${files.length} files to index`);
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = relative(rootDir, file);
        
        await this.collection.add({
          ids: [relativePath],
          documents: [content],
          metadatas: [{
            path: relativePath,
            type: 'code',
            lastModified: new Date().toISOString()
          }]
        });
        
        console.log(`Indexed: ${relativePath}`);
      } catch (error) {
        console.error(`Failed to index ${file}:`, error);
      }
    }
  }

  async searchContext(query: string, nResults: number = 3) {
    if (!this.isInitialized || !this.collection) {
      console.warn("ChromaDB not initialized, returning empty context");
      return [];
    }

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: nResults
      });

      if (!results.documents || !results.documents[0]) {
        return [];
      }

      return results.documents[0].map((doc, i) => ({
        content: doc || "",
        metadata: results.metadatas?.[0]?.[i] || {
          path: "unknown",
          type: "code",
          lastModified: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error("Failed to search context:", error);
      return [];
    }
  }

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        files.push(...this.getAllFiles(fullPath));
      } else if (entry.isFile()) {
        // Only include code files
        if (this.isCodeFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.json', 
      '.py', '.java', '.cpp', '.c', '.h', 
      '.hpp', '.cs', '.go', '.rs', '.php'
    ];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }
} 