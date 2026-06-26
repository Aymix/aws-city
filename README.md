# AWS City

A 2D isometric city-building puzzle game that teaches **AWS, DevOps, FinOps and SecOps**
through spatial simulation. Every AWS service is a physical object in a living city
(EC2 → house, Security Group → door lock, VPC → city walls, …).

See [`ROADMAP.md`](./ROADMAP.md) for the architecture and milestone plan.

## Stack

TypeScript · Phaser 3 (rendering) · React (UI) · Vite · Vitest · pnpm workspaces

## Development

```bash
pnpm install      # install workspace deps
pnpm dev          # run the web app (blank iso canvas + HUD)
pnpm test         # run all tests
pnpm typecheck    # tsc project build
pnpm lint         # eslint
pnpm boundaries   # dependency-cruiser — enforces the domain-stays-pure rule
```

## Architecture in one line

The **domain core owns the truth**; Phaser and React are adapters that render an
immutable world snapshot. `packages/domain` may never import React, Phaser, or the DOM —
this is enforced mechanically by `pnpm boundaries` in CI.

## Contributing workflow

Each milestone is developed on its own branch (`milestone/<id>-<slug>`) and merged into
`main` after review.
