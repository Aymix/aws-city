// Adapters layer: storage, share/export, AI hint providers (implement ports).
export { InMemoryStorage } from "./storage/in-memory-storage";
export { LocalStorageAdapter } from "./storage/local-storage";
export { LlmHintProvider, type CompleteFn } from "./hints/llm-hint-provider";
