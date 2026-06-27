// Content layer: AWS service packs, reference topologies, and (later)
// puzzle/incident/scenario definitions.
export { awsServiceDefinitions, createAwsRegistry } from "./aws";
export { awsValidationRules, createAwsValidationEngine } from "./aws/rules";
export { buildPublicWebServer, buildPrivateDatabase } from "./topologies/reference";
export { incidents, sshExposureIncident } from "./incidents";
export { RuleBasedHintProvider, createHintProvider } from "./hints";
export {
  puzzles,
  fixSecurityGroupPuzzle,
  addInternetGatewayPuzzle,
  fixPublicDatabasePuzzle,
  rightSizeInstancePuzzle,
  repelDataBreachPuzzle,
} from "./puzzles";
