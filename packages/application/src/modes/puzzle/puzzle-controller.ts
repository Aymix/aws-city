import { DomainError, type City, type Diagnostic, type ValidationEngine } from "@aws-city/domain";
import type { Command } from "../../commands/command";
import { executeCommand } from "../../commands/execute-command";
import { evaluateGoal } from "./goal";
import type { Puzzle } from "./puzzle";

export interface CommandResult {
  readonly ok: boolean;
  readonly error?: string;
  /** Whether the puzzle is solved after this command. */
  readonly solved: boolean;
}

export interface PuzzleStatus {
  readonly solved: boolean;
  readonly moves: number;
  /** Remaining moves, or null when the puzzle has no move limit. */
  readonly movesRemaining: number | null;
  /** True when the move limit is exhausted and the puzzle is still unsolved. */
  readonly outOfMoves: boolean;
}

/**
 * A headless puzzle session: builds the initial city, applies player commands
 * (enforcing the puzzle's constraints), and re-evaluates the goal after each.
 * This is the application use-case the UI will drive in M6.
 */
export class PuzzleController {
  private readonly cityState: City;
  private moveCount = 0;

  constructor(
    private readonly puzzle: Puzzle,
    private readonly validation: ValidationEngine,
  ) {
    this.cityState = puzzle.build();
  }

  get city(): City {
    return this.cityState;
  }

  get solved(): boolean {
    return evaluateGoal(this.puzzle.goal, { city: this.cityState, validation: this.validation });
  }

  diagnostics(): readonly Diagnostic[] {
    return this.validation.run(this.cityState);
  }

  get status(): PuzzleStatus {
    const max = this.puzzle.constraints?.maxMoves;
    const solved = this.solved;
    return {
      solved,
      moves: this.moveCount,
      movesRemaining: max !== undefined ? Math.max(0, max - this.moveCount) : null,
      outOfMoves: max !== undefined && this.moveCount >= max && !solved,
    };
  }

  apply(command: Command): CommandResult {
    const rejection = this.reasonToReject(command);
    if (rejection) return { ok: false, error: rejection, solved: this.solved };

    try {
      executeCommand(this.cityState, command);
    } catch (err) {
      if (err instanceof DomainError) return { ok: false, error: err.message, solved: this.solved };
      throw err;
    }

    this.moveCount += 1;
    return { ok: true, solved: this.solved };
  }

  private reasonToReject(command: Command): string | undefined {
    const constraints = this.puzzle.constraints;
    if (!constraints) return undefined;

    if (constraints.maxMoves !== undefined && this.moveCount >= constraints.maxMoves) {
      return "Move limit reached";
    }
    if (constraints.allowedCommands && !constraints.allowedCommands.includes(command.type)) {
      return `Command "${command.type}" is not allowed in this puzzle`;
    }
    if (
      command.type === "add-service" &&
      constraints.allowedServiceKinds &&
      !constraints.allowedServiceKinds.includes(command.kind)
    ) {
      return `You may not add a "${command.kind}" in this puzzle`;
    }
    return undefined;
  }
}
