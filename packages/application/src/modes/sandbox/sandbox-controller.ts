import {
  City,
  DomainError,
  deserializeCity,
  serializeCity,
  type CitySnapshot,
  type ServiceRegistry,
} from "@aws-city/domain";
import type { Command } from "../../commands/command";
import { executeCommand } from "../../commands/execute-command";

export interface SandboxResult {
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * Free-build mode: no goal, no move limit. Applies commands and can snapshot /
 * restore the city for saving and sharing.
 */
export class SandboxController {
  private constructor(private readonly cityState: City) {}

  static empty(registry: ServiceRegistry): SandboxController {
    return new SandboxController(new City(registry));
  }

  static fromSnapshot(snapshot: CitySnapshot, registry: ServiceRegistry): SandboxController {
    return new SandboxController(deserializeCity(snapshot, registry));
  }

  get city(): City {
    return this.cityState;
  }

  apply(command: Command): SandboxResult {
    try {
      executeCommand(this.cityState, command);
      return { ok: true };
    } catch (err) {
      if (err instanceof DomainError) return { ok: false, error: err.message };
      throw err;
    }
  }

  snapshot(): CitySnapshot {
    return serializeCity(this.cityState);
  }
}
