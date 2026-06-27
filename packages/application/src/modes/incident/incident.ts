import type { City } from "@aws-city/domain";
import type { Goal } from "../puzzle/goal";

/**
 * A production incident definition. The city starts healthy; at `triggerTick`
 * the `inject` fault fires, raising an alert. The player investigates (via
 * diagnostics) and applies commands until `goal` (service restored) holds.
 */
export interface Incident {
  readonly id: string;
  readonly title: string;
  readonly briefing: string;
  build(): City;
  readonly triggerTick: number;
  inject(city: City): void;
  readonly alert: string;
  readonly goal: Goal;
}
