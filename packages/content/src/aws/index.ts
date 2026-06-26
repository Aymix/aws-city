import { ServiceRegistry, type ServiceDefinition } from "@aws-city/domain";

/**
 * The AWS service pack (M1 subset). Each entry is a {@link ServiceDefinition}
 * registered as data — the domain and engines never hard-code these kinds, so
 * future provider packs (K8s, Azure, GCP) plug in the same way.
 *
 * `displayName` keeps the AWS name here; the city-metaphor visuals (house,
 * door lock, city walls, …) are a rendering concern added in M6.
 */
export const awsServiceDefinitions: readonly ServiceDefinition[] = [
  {
    kind: "vpc",
    provider: "aws",
    category: "network",
    displayName: "VPC",
    containment: { allowedIn: [] },
    defaults: { cidr: "10.0.0.0/16" },
  },
  {
    kind: "subnet",
    provider: "aws",
    category: "network",
    displayName: "Subnet",
    containment: { allowedIn: ["vpc"] },
    defaults: { cidr: "10.0.0.0/24", public: false },
  },
  {
    kind: "ec2",
    provider: "aws",
    category: "compute",
    displayName: "EC2 Instance",
    containment: { allowedIn: ["subnet"] },
    defaults: { instanceType: "t3.micro" },
  },
  {
    kind: "security-group",
    provider: "aws",
    category: "security",
    displayName: "Security Group",
    containment: { allowedIn: ["vpc"] },
    defaults: { ingress: [] },
  },
  {
    kind: "internet-gateway",
    provider: "aws",
    category: "network",
    displayName: "Internet Gateway",
    containment: { allowedIn: [] },
  },
  {
    kind: "route-table",
    provider: "aws",
    category: "network",
    displayName: "Route Table",
    containment: { allowedIn: ["vpc"] },
    defaults: { routes: [] },
  },
  {
    kind: "nat-gateway",
    provider: "aws",
    category: "network",
    displayName: "NAT Gateway",
    containment: { allowedIn: ["subnet"] },
  },
  {
    kind: "iam-role",
    provider: "aws",
    category: "identity",
    displayName: "IAM Role",
    containment: { allowedIn: [] },
    defaults: { policies: [] },
  },
];

/** Builds a {@link ServiceRegistry} seeded with the AWS service pack. */
export function createAwsRegistry(): ServiceRegistry {
  return ServiceRegistry.from(awsServiceDefinitions);
}
