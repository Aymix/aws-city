import { invariant } from "../invariant";

/**
 * A branded identifier for a service in the city. Branding stops a raw string
 * (or some other id) from being passed where a ServiceId is expected, without
 * any runtime cost.
 */
export type ServiceId = string & { readonly __brand: "ServiceId" };

/** Constructs a validated {@link ServiceId} from a non-empty string. */
export function serviceId(value: string): ServiceId {
  invariant(value.length > 0, "ServiceId must be a non-empty string");
  return value as ServiceId;
}
