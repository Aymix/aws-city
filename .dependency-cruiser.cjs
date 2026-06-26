/**
 * Architectural boundary enforcement.
 *
 * The Prime Directive: the domain owns the truth and depends on nothing outward.
 * These rules fail the build (CI: `pnpm boundaries`) if any inward-only arrow is
 * violated — e.g. if packages/domain ever imports React, Phaser, or the web app.
 */
module.exports = {
  forbidden: [
    {
      name: "domain-stays-pure",
      comment:
        "packages/domain must be framework-agnostic: no React, Phaser, DOM libs, or app code.",
      severity: "error",
      from: { path: "^packages/domain/src" },
      to: {
        // pnpm nests deps under node_modules/.pnpm/<pkg>@x/node_modules/<pkg>, and
        // tsPreCompilationDeps resolves to @types/<pkg>, so match the unanchored
        // "node_modules/(@types/)?<pkg>/" segment rather than "^node_modules/".
        path: "(node_modules/(@types/)?(react|react-dom|phaser)/|^apps/|^packages/(application|adapters|content)/)",
      },
    },
    {
      name: "application-no-render",
      comment: "Application layer must not depend on rendering frameworks.",
      severity: "error",
      from: { path: "^packages/application/src" },
      to: { path: "node_modules/(@types/)?(react|react-dom|phaser)/" },
    },
    {
      name: "no-circular",
      comment: "Circular dependencies break the layering.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
