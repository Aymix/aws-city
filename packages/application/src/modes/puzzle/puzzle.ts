import type { City } from "@aws-city/domain";
import type { CommandType } from "../../commands/command";
import type { Goal } from "./goal";

/** Optional limits a puzzle can impose on the player. */
export interface PuzzleConstraints {
  /** Maximum number of successful commands allowed. */
  readonly maxMoves?: number;
  /** If set, only these command types may be applied. */
  readonly allowedCommands?: readonly CommandType[];
  /** If set, `add-service` may only create services of these kinds. */
  readonly allowedServiceKinds?: readonly string[];
}

/**
 * A puzzle definition (data). `build()` produces the initial, usually-broken
 * city; `goal` is the declarative win-condition. Concrete puzzles live in the
 * content package.
 */
export interface Puzzle {
  readonly id: string;
  readonly title: string;
  readonly briefing: string;
  build(): City;
  readonly goal: Goal;
  readonly constraints?: PuzzleConstraints;
}
