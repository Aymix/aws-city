export type Listener<T> = (event: T) => void;

/**
 * A minimal synchronous pub/sub bus. The game loop publishes simulation events
 * here so adapters (UI, audio, animation) can react without the domain knowing
 * about them. Framework-agnostic and dependency-free.
 */
export class EventBus<T> {
  private readonly listeners = new Set<Listener<T>>();

  /** Subscribes a listener. Returns a disposer that unsubscribes it. */
  on(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.off(listener);
  }

  off(listener: Listener<T>): void {
    this.listeners.delete(listener);
  }

  emit(event: T): void {
    for (const listener of this.listeners) listener(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}
