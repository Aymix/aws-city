# AWS City — Architecture & Roadmap

> A 2D isometric city-building puzzle game that teaches AWS, DevOps, FinOps and SecOps
> through spatial simulation. Every AWS service is a physical object in a living city.

---

## 0. Locked Technical Decisions

| Concern            | Choice                                  | Rationale |
|--------------------|-----------------------------------------|-----------|
| Language           | TypeScript (strict)                     | Type-safe domain modeling, refactor safety |
| Rendering          | **Phaser 3**                            | Mature 2D/iso, input, cameras |
| UI shell           | **React + TypeScript**                  | Rich inspector/editor panels, testable |
| Build              | Vite                                    | Fast HMR, native TS/ESM |
| Test runner        | Vitest + @testing-library/react         | Same engine as Vite, fast, jsdom |
| Monorepo           | pnpm workspaces                         | Hard package boundaries enforce layering |
| Lint/format        | ESLint + Prettier                       | Consistency |
| CI                 | GitHub Actions                          | Test + typecheck + lint gates |

### The Prime Directive (non-negotiable)

**The domain owns the truth. Phaser and React are adapters that render it.**

- The domain layer is pure TypeScript with **zero** imports from Phaser, React, or the DOM.
- Simulation advances via our own **fixed-timestep tick**, not Phaser's loop.
- Phaser reads an immutable **world snapshot** each frame and draws it.
- React reads the same snapshot (or selected slices) and renders the HUD.
- This makes every engine (networking, validation, cost, security) **testable headless**.

---

## 1. Layered Architecture (Hexagonal + DDD)

```
                    ┌─────────────────────────────────────────┐
                    │            ADAPTERS (outer ring)          │
                    │  Phaser renderer · React UI · Storage ·   │
                    │  Share/export · AI hint provider          │
                    └───────────────▲───────────────────────────┘
                                    │ ports (interfaces)
                    ┌───────────────┴───────────────────────────┐
                    │            APPLICATION LAYER               │
                    │  Game loop · Mode controllers (Puzzle /    │
                    │  Incident / Sandbox / FinOps / SecOps) ·   │
                    │  Command handlers · Use cases              │
                    └───────────────▲───────────────────────────┘
                                    │
                    ┌───────────────┴───────────────────────────┐
                    │              DOMAIN CORE                    │
                    │  City aggregate · Service entities (value  │
                    │  objects) · ServiceRegistry · Engines:     │
                    │  Networking · Validation · Cost · Security  │
                    │  · Simulation · Events                     │
                    └────────────────────────────────────────────┘
```

**Dependency rule:** arrows point inward only. Domain depends on nothing. Application
depends on domain. Adapters depend on application/domain through **ports** (interfaces).

### The extensibility keystone: `ServiceRegistry`

Every AWS service (and later: K8s, Docker, Terraform, Azure, GCP resources) is registered
as a **`ServiceDefinition`** — data + behavior plugged into the engine, never hard-coded
into a giant switch statement. This is what makes future expansions "just register a plugin."

```ts
interface ServiceDefinition<Props = unknown> {
  kind: string;                 // "ec2", "security-group", "k8s-pod"...
  provider: "aws" | "azure" | "gcp" | "k8s" | ...;
  category: "compute" | "network" | "storage" | "security" | ...;
  visual: VisualSpec;           // sprite/iso footprint — consumed by Phaser adapter
  defaults: Props;
  validators: Validator[];      // contribute rules to the Validation engine
  costModel?: CostModel;        // contribute to the Cost engine
  securityModel?: SecurityModel;// contribute to the Security engine
  networkBehavior?: NetworkNodeBehavior; // contribute to Networking sim
}
```

Adding a new cloud = shipping a new pack of `ServiceDefinition`s. **No engine code changes.**

### Where each required system lives

| System              | Layer        | Package / module |
|---------------------|--------------|------------------|
| Core game loop      | Application  | `app/loop` |
| Simulation engine   | Domain       | `domain/simulation` |
| Networking sim      | Domain       | `domain/engines/networking` |
| Validation engine   | Domain       | `domain/engines/validation` |
| Cost engine         | Domain       | `domain/engines/cost` |
| Security engine     | Domain       | `domain/engines/security` |
| Puzzle engine       | Application  | `app/modes/puzzle` |
| Save/load           | Adapter+port | `domain/serialization` + `adapters/storage` |
| Sharing/export      | Adapter      | `adapters/share` |
| AI hint system      | App + port   | `app/hints` + `adapters/ai` |
| Level editor        | App + UI     | `app/editor` + `apps/web/editor` |

---

## 2. Monorepo Layout

```
aws-city/
├── package.json                 # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
├── .github/workflows/ci.yml
├── packages/
│   ├── domain/                  # PURE TS. No Phaser/React/DOM. The heart.
│   │   ├── src/
│   │   │   ├── model/           # City aggregate, Service entities, value objects
│   │   │   ├── registry/        # ServiceRegistry + ServiceDefinition
│   │   │   ├── engines/
│   │   │   │   ├── networking/  # reachability / packet-flow simulation
│   │   │   │   ├── validation/  # rule engine -> diagnostics
│   │   │   │   ├── cost/        # cost accrual over time
│   │   │   │   └── security/    # posture scoring, attack simulation
│   │   │   ├── simulation/      # tick engine, world state, events
│   │   │   └── serialization/   # versioned (de)serialization of a City
│   │   └── test/
│   ├── content/                 # DATA: service packs, puzzles, incidents, scenarios
│   │   └── src/aws/             # AWS ServiceDefinition pack + puzzle JSON
│   ├── application/             # use cases, mode controllers, game loop, hints orchestration
│   └── adapters/                # storage, share/export, AI provider (implement ports)
├── apps/
│   └── web/                     # Vite app: React shell + Phaser canvas
│       ├── src/
│       │   ├── render/          # Phaser scenes — read snapshots, draw iso
│       │   ├── ui/              # React HUD, inspectors, panels
│       │   └── editor/          # level editor UI
│       └── test/
└── ROADMAP.md
```

**Boundary enforcement:** `packages/domain` has no dependencies on `phaser`, `react`, or
`apps/*`. A lint rule (`eslint-plugin-import` / `dependency-cruiser`) fails CI if violated.

---

## 3. Milestones

Ordered by dependency. Each is independently shippable and TDD-driven (red → green →
refactor). Domain-heavy milestones come first because they carry the most logic and the
highest test value, and they need no rendering to be proven correct.

---

### M0 — Foundations & Tooling
**Why it exists:** establish the skeleton and the guardrails *before* any feature, so the
architecture can't rot. This is where we make wrong layering impossible, not just discouraged.

- **Objectives:** Bootable monorepo, green CI, enforced layer boundaries.
- **Deliverables:** pnpm workspace; `domain`, `application`, `adapters`, `content` packages;
  `apps/web` Vite shell rendering an empty Phaser canvas + React HUD; Vitest wired;
  ESLint/Prettier; dependency-cruiser rule; GitHub Actions running `typecheck + lint + test`.
- **Features:** none (infrastructure milestone).
- **Test strategy:** one trivial domain unit test, one React render test, one boundary
  test (importing React from `domain` must fail the build). Prove the harness works.
- **Risks:** monorepo wiring friction. *Mitigation:* keep packages minimal at first.
- **Dependencies:** none.
- **Definition of Done:** `pnpm test`, `pnpm typecheck`, `pnpm lint` all green locally and in CI;
  `pnpm dev` shows a blank isometric canvas + a HUD div.

---

### M1 — Domain Model: the City graph
**Why it exists:** every mode, engine and puzzle reads/writes the City. Get the model right
and everything downstream is straightforward; get it wrong and everything fights it.

- **Objectives:** Model the city as a typed graph of services + connections, with a plugin
  `ServiceRegistry`.
- **Deliverables:** `City` aggregate (add/remove/connect/query nodes); `Service` entity;
  value objects (`Port`, `CidrBlock`, `ServiceId`, `Connection`); `ServiceRegistry` +
  `ServiceDefinition`; first AWS pack (VPC, Subnet, EC2, SG, IGW, RouteTable, NAT, IAM…).
- **Features:** construct/mutate a city in code; invariants (e.g. EC2 must live in a Subnet;
  Subnet must live in a VPC).
- **Test strategy:** exhaustive unit tests on aggregate invariants and registry lookup;
  property-style tests for connection symmetry; fixtures for a "known-good city".
- **Risks:** over-modeling AWS too literally. *Mitigation:* model only what a rule/engine
  consumes; YAGNI on properties.
- **Dependencies:** M0.
- **Definition of Done:** can build the AWS reference topologies (public web server, private
  DB) purely in code; 100% of aggregate invariants covered by tests.

---

### M2 — Networking Simulation
**Why it exists:** "Is machine 1 reachable from the internet?" is the core question behind
most puzzles. This engine answers reachability deterministically.

- **Objectives:** Given a City, compute whether traffic can flow between two endpoints,
  and *why/why not*.
- **Deliverables:** `NetworkingEngine.reachability(from, to, port)` → path or blocked-reason
  chain traversing IGW → RouteTable → NAT → Subnet → SG → port → instance.
- **Features:** packet-flow trace; "blocked by Security Group on port 443" style explanations.
- **Test strategy:** table-driven tests per AWS construct (SG allow/deny, missing IGW, wrong
  route, public vs private subnet, NAT for egress). Each blocked reason is asserted explicitly.
- **Risks:** AWS networking edge cases. *Mitigation:* start with the subset the puzzles use;
  expand rule-by-rule with a test each.
- **Dependencies:** M1.
- **Definition of Done:** every networking puzzle scenario's expected reachability verdict is
  reproduced by the engine in tests.

---

### M3 — Validation Engine
**Why it exists:** turns the raw model + networking facts into player-facing **diagnostics**
("Public database exposure", "Missing NAT Gateway"). Powers puzzle win-conditions and hints.

- **Objectives:** Pluggable rule engine producing structured `Diagnostic[]` (severity, target,
  message, fix suggestion id).
- **Deliverables:** `ValidationEngine.run(city)`; rules contributed by `ServiceDefinition`s
  and by cross-cutting rule packs; diagnostic catalog.
- **Features:** least-privilege checks, exposure checks, missing-component checks.
- **Test strategy:** one test per rule (positive + negative city fixture); golden-file test on
  full diagnostic output for reference cities.
- **Risks:** rule sprawl. *Mitigation:* rules are data-registered and individually tested.
- **Dependencies:** M1, M2.
- **Definition of Done:** reference "broken" cities each yield exactly their expected diagnostics.

---

### M4 — Simulation Engine & Core Game Loop
**Why it exists:** the city must feel *alive* and time-based (load rising, costs accruing,
incidents firing). Fixed-timestep tick is the heartbeat all dynamic systems subscribe to.

- **Objectives:** Deterministic fixed-timestep simulation producing immutable world snapshots
  + an event stream.
- **Deliverables:** `SimulationEngine.tick(dt)`; `WorldState` snapshot; domain event bus;
  `app/loop` driving ticks decoupled from render frames (accumulator pattern).
- **Features:** time advances; metrics evolve (e.g. EC2 load); events emitted.
- **Test strategy:** determinism tests (same seed+inputs → same snapshots); fixed-step accuracy
  tests; event emission assertions. **All headless — no Phaser.**
- **Risks:** coupling render fps to sim. *Mitigation:* accumulator loop with explicit `dt`.
- **Dependencies:** M1.
- **Definition of Done:** simulation runs N ticks headless, deterministic, emitting expected events.

---

### M5 — Puzzle Engine & Mode Controller (first playable, headless)
**Why it exists:** delivers the first end-to-end *game* — load a broken city, let the player
issue commands, detect win. Proves the whole domain stack before we spend effort on visuals.

- **Objectives:** Define puzzles as data; load → play → evaluate win condition.
- **Deliverables:** `Puzzle` schema (initial city + goal + constraints); `PuzzleController`
  (apply commands, re-validate, check goal); 3–5 starter puzzles in `content`.
- **Features:** "fix the Security Group", "add the missing IGW", win/lose detection, move limits.
- **Test strategy:** scripted playthrough tests (sequence of commands → expected win); invalid
  command rejection; goal-not-met assertions.
- **Risks:** goal expressiveness. *Mitigation:* goals = composition of validation/networking predicates.
- **Dependencies:** M1–M4.
- **Definition of Done:** a full puzzle is solvable end-to-end in a test with zero UI.

---

### M6 — Rendering Adapter (Phaser) + React Shell: make it visible
**Why it exists:** now that the brain is proven, give it a body. First time the player *sees*
and clicks the city.

- **Objectives:** Render a `WorldState` snapshot as an isometric scene; map clicks to commands;
  show diagnostics in a React inspector.
- **Deliverables:** Phaser scene that draws services from `visual` specs; iso projection +
  camera/pan/zoom; selection; React HUD with diagnostics panel + service inspector;
  command dispatch from UI → application layer.
- **Features:** see the city, select a building, read its problems, apply a fix, watch it resolve.
- **Test strategy:** unit-test the iso projection + snapshot→sprite mapping (pure functions);
  React Testing Library on panels; a thin Phaser smoke test. Heavy logic stays in tested pure code.
- **Risks:** logic leaking into Phaser. *Mitigation:* renderer is a pure function of snapshot;
  no game rules in scenes (enforced by boundary lint).
- **Dependencies:** M5.
- **Definition of Done:** a puzzle from M5 is now fully playable with mouse in the browser.

---

### M7 — Save/Load & Serialization + Sandbox Mode
**Why it exists:** persistence underpins Sandbox and Sharing. Versioned schema protects players'
creations across future expansions.

- **Objectives:** Deterministically (de)serialize a City with schema versioning + migrations.
- **Deliverables:** `serialize/deserialize` (round-trip stable); version field + migration
  pipeline; `StoragePort` + localStorage/IndexedDB adapter; Sandbox mode (free build, save, load).
- **Features:** build freely, save, reload, no data loss.
- **Test strategy:** round-trip property tests (city == deserialize(serialize(city))); migration
  tests (old payload → current); corrupt-input handling.
- **Risks:** schema drift breaking saves. *Mitigation:* versioning + migration tests from day one.
- **Dependencies:** M1, M6.
- **Definition of Done:** any built city survives save→reload byte-stable; an old-version fixture migrates.

---

### M8 — Cost Engine & FinOps Mode
**Why it exists:** introduces the FinOps learning dimension — money accrues over time; optimize
without breaking availability.

- **Objectives:** Per-tick cost accrual from `costModel`s; budget goals.
- **Deliverables:** `CostEngine` subscribing to the sim tick; per-service cost models; FinOps
  goals ("keep functional under $X/mo"); cost overlay in UI.
- **Features:** running bill, cost breakdown, FinOps puzzles (downsize, spot, remove waste).
- **Test strategy:** cost accrual math tests; "functional AND under budget" goal tests; regression
  fixtures for reference architectures' monthly cost.
- **Risks:** fake-but-plausible pricing. *Mitigation:* pricing is data in `content`, swappable, tested.
- **Dependencies:** M4 (tick), M5 (goals), M3 (functional check).
- **Definition of Done:** a FinOps puzzle is won only when functional and within budget.

---

### M9 — Security Engine & SecOps Mode
**Why it exists:** the SecOps learning dimension — attacks probe weaknesses; players harden the city.

- **Objectives:** Posture scoring + attack simulation against the city.
- **Deliverables:** `SecurityEngine` (posture score from `securityModel`s + validation findings);
  attack scenarios (exposed port, over-broad IAM, no WAF); SecOps goals (least privilege,
  segmentation, encryption, WAF, MFA, monitoring).
- **Features:** attack lands or is repelled based on architecture; harden to win.
- **Test strategy:** attack-vs-defense matrix tests (exposed DB → breach; SG fix → repelled);
  posture-score tests.
- **Risks:** security oversimplification. *Mitigation:* scenarios are data, each individually tested.
- **Dependencies:** M2, M3, M4.
- **Definition of Done:** each attack scenario is provably blocked by its intended mitigation.

---

### M10 — Incident Mode
**Why it exists:** the investigation/operations skill — random production incidents, find root
cause, restore service. Composes everything above.

- **Objectives:** Trigger incidents on the sim timeline; provide investigation surfaces (alerts,
  metrics, logs ≈ CloudWatch/CloudTrail); detect resolution.
- **Deliverables:** incident definitions (trigger + symptom + root cause + resolution predicate);
  alert/metric/log feeds derived from world state; incident controller.
- **Features:** alert fires → investigate via watchtower/records → fix → service restored.
- **Test strategy:** scripted incident playthroughs; false-fix rejection; resolution detection.
- **Risks:** investigation feeling arbitrary. *Mitigation:* symptoms deterministically derived from state.
- **Dependencies:** M4–M9.
- **Definition of Done:** an incident is detectable, investigable, and resolvable end-to-end in tests.

---

### M11 — AI Hint System
**Why it exists:** adaptive teaching — nudge stuck players toward the next step without spoiling.

- **Objectives:** Tiered hints (nudge → strategy → solution) behind a port, with a deterministic
  rule-based provider and an optional LLM provider.
- **Deliverables:** `HintPort`; rule-based hint provider derived from diagnostics + goal gap;
  optional `adapters/ai` LLM provider; hint UI.
- **Features:** "Something's blocking 443 — inspect the door locks" → escalating specificity.
- **Test strategy:** rule-based provider fully unit-tested (deterministic); LLM provider tested
  via a mocked port (no network in tests).
- **Risks:** hints leaking answers / non-determinism. *Mitigation:* tiering + deterministic default
  provider; LLM isolated behind the port.
- **Dependencies:** M3, M5.
- **Definition of Done:** for any stuck state, the rule-based provider returns a correct next-step hint, tested.

---

### M12 — Level Editor & Sharing/Export
**Why it exists:** turns the game into a platform — author levels, and share a city as an
interactive portfolio link (your original vision).

- **Objectives:** Visual authoring of cities/puzzles; export/import + shareable link.
- **Deliverables:** editor UI (place/connect services, set goals); puzzle export to `content`
  format; `SharePort` + adapter (URL-encoded or hosted blob) producing a read/interactive link.
- **Features:** build a level, set its goal, validate solvability, share a link others can open.
- **Test strategy:** editor command tests; "exported puzzle is solvable" validation (reuse M5
  playthrough harness on authored content); share round-trip tests.
- **Risks:** authored unsolvable levels. *Mitigation:* solvability check gate before publish.
- **Dependencies:** M5, M7.
- **Definition of Done:** a user-authored puzzle round-trips through a share link and is verified solvable.

---

## 4. Future Expansion (proved by the architecture, not built yet)

Because engines consume `ServiceDefinition`s, each of these is **a new content pack + rules**,
not an engine rewrite:

- **Docker / Kubernetes** — new `provider:"k8s"` definitions (Pod, Service, Ingress…) with their
  own network/validation behavior; the city gains a new district type.
- **Terraform** — import/export a city as IaC (a new serialization adapter).
- **CI/CD** — pipeline objects on the sim timeline (events feeding deployments).
- **Azure / GCP / Multi-cloud / Hybrid** — additional provider packs; cross-provider connections
  become new connection types with new validators.

The test that this works: M1's `ServiceRegistry` and the per-engine `*Model`/`*Behavior` hooks
must let us add a single new service kind with **zero edits to engine internals.**

---

## 5. Working Agreement (TDD)

1. **Red:** write a failing test that states the next required behavior.
2. **Green:** minimum code to pass.
3. **Refactor:** clean up under green tests.
4. Repeat. Domain logic carries high coverage; adapters carry thin smoke tests.
   No production code is written before a failing test asks for it.
