import type { ServiceId } from "@aws-city/domain";

/**
 * A reified player action. Commands are the only way the city is mutated during
 * play: the UI dispatches them, puzzles restrict and count them, and they are
 * the natural seam for undo/replay/sharing in later milestones.
 */
export type Command =
  | {
      readonly type: "add-service";
      readonly kind: string;
      readonly id?: string;
      readonly in?: ServiceId;
      readonly properties?: Record<string, unknown>;
    }
  | { readonly type: "remove-service"; readonly id: ServiceId }
  | {
      readonly type: "connect";
      readonly from: ServiceId;
      readonly to: ServiceId;
      readonly connectionType: string;
    }
  | {
      readonly type: "disconnect";
      readonly from: ServiceId;
      readonly to: ServiceId;
      readonly connectionType: string;
    }
  | {
      readonly type: "update-properties";
      readonly id: ServiceId;
      readonly properties: Record<string, unknown>;
    };

export type CommandType = Command["type"];
