import type { City } from "@aws-city/domain";
import type { Command } from "./command";

/**
 * Applies a {@link Command} to a city, mutating it. Illegal commands surface as
 * the DomainError thrown by the City's invariants — callers (e.g. the puzzle
 * controller) translate that into player-facing feedback.
 */
export function executeCommand(city: City, command: Command): void {
  switch (command.type) {
    case "add-service":
      city.add(command.kind, {
        ...(command.id !== undefined ? { id: command.id } : {}),
        ...(command.in !== undefined ? { in: command.in } : {}),
        ...(command.properties !== undefined ? { properties: command.properties } : {}),
      });
      return;
    case "remove-service":
      city.remove(command.id);
      return;
    case "connect":
      city.connect(command.from, command.to, command.connectionType);
      return;
    case "disconnect":
      city.disconnect(command.from, command.to, command.connectionType);
      return;
    case "update-properties":
      city.updateProperties(command.id, command.properties);
      return;
  }
}
