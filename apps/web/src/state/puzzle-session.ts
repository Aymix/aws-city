import {
  PuzzleController,
  type Command,
  type CommandResult,
  type Puzzle,
} from "@aws-city/application";
import type { City, Diagnostic, ServiceId, ValidationEngine } from "@aws-city/domain";

/** An immutable view of the session, consumed by React and the Phaser scene. */
export interface PuzzleSnapshot {
  readonly title: string;
  readonly briefing: string;
  readonly city: City;
  readonly selectedId: ServiceId | null;
  readonly diagnostics: readonly Diagnostic[];
  readonly solved: boolean;
  readonly moves: number;
  readonly movesRemaining: number | null;
  readonly outOfMoves: boolean;
  readonly lastError: string | null;
}

/**
 * A framework-agnostic store wrapping a {@link PuzzleController}. It owns the
 * UI-only "selection" state, derives an immutable snapshot, and notifies
 * subscribers on change — the shape `React.useSyncExternalStore` expects. No
 * React in here, so it is fully node-testable.
 */
export class PuzzleSession {
  private readonly controller: PuzzleController;
  private selectedId: ServiceId | null = null;
  private lastError: string | null = null;
  private snapshot: PuzzleSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly puzzle: Puzzle,
    validation: ValidationEngine,
  ) {
    this.controller = new PuzzleController(puzzle, validation);
    this.snapshot = this.build();
  }

  getSnapshot(): PuzzleSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  select(id: ServiceId | null): void {
    this.selectedId = id;
    this.refresh();
  }

  apply(command: Command): CommandResult {
    const result = this.controller.apply(command);
    this.lastError = result.ok ? null : (result.error ?? "Command failed");
    this.refresh();
    return result;
  }

  private refresh(): void {
    this.snapshot = this.build();
    for (const listener of this.listeners) listener();
  }

  private build(): PuzzleSnapshot {
    const status = this.controller.status;
    return {
      title: this.puzzle.title,
      briefing: this.puzzle.briefing,
      city: this.controller.city,
      selectedId: this.selectedId,
      diagnostics: this.controller.diagnostics(),
      solved: status.solved,
      moves: status.moves,
      movesRemaining: status.movesRemaining,
      outOfMoves: status.outOfMoves,
      lastError: this.lastError,
    };
  }
}
