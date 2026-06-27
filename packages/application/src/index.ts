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
  type PuzzleEngines,
} from "./modes/puzzle/puzzle-controller";

export { SandboxController, type SandboxResult } from "./modes/sandbox/sandbox-controller";
export type { StoragePort } from "./storage/storage-port";

export type { Incident } from "./modes/incident/incident";
export { IncidentSession, type IncidentResult } from "./modes/incident/incident-session";

export type { Hint, HintTier, HintRequest, HintProvider } from "./hints/hint";

export { encodeShare, decodeShare, buildShareUrl, parseShareUrl } from "./share/share";
