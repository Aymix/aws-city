// Application layer: game loop, commands, mode controllers, use cases.
export { GameLoop, type AdvanceResult } from "./loop/game-loop";

export type { Command, CommandType } from "./commands/command";
export { executeCommand } from "./commands/execute-command";

export { evaluateGoal, type Goal, type GoalContext } from "./modes/puzzle/goal";
export type { Puzzle, PuzzleConstraints } from "./modes/puzzle/puzzle";
export {
  PuzzleController,
  type CommandResult,
  type PuzzleStatus,
} from "./modes/puzzle/puzzle-controller";

export { SandboxController, type SandboxResult } from "./modes/sandbox/sandbox-controller";
export type { StoragePort } from "./storage/storage-port";
