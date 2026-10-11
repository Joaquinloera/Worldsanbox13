# KINO #281102 — SWARM/SKIM research runtime (development branch)

This is a **local, testable task planner**, not a deployed autonomous research agent. It does not fetch provider websites or access credentials. Research records must include official evidence URLs. The GitHub Apps, Stripe, AAMVA and AZDHS provider records are research candidates, not active integrations.

Run from repository root with Node.js 18+:

```sh
node --test kino/provider-registry.test.cjs kino/swarm-runner.test.cjs
node kino/run-research.cjs
```

`run-research.cjs` emits a JSON planned batch; `mode=PLANNED_NOT_EXECUTED` is deliberate. The next integration must dispatch those tasks to authenticated workers, capture sourced responses, and persist audit trails. Do not claim deployment from these files. No production configuration changes.
