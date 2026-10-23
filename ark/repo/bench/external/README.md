# External benchmarks

The site's speed and size claims outside the homepage's own benchmark
(`ark/docs/lib/claims.ts`) come from runs of other projects' benchmarks. This
directory holds what those runs need beyond the projects themselves, and the
plan they follow, written before the release candidate's data existed.

## The plan

One run, published whatever it shows. Every published speed sentence is a
test fixed here first.

**Builds.** The release candidate, built once, on Node 24.14.1.

- B1: the default build, `{}`, as a production build.
- B2: the `"smallest"` preset, as a production build: the size build.
- dynamic: plain `type()`.

The production builds are esbuild builds with the `"production"` condition.
External projects are pinned: moltar's typescript-runtime-type-benchmarks at
499f3fb, with its own installs; schema-benchmarks at f1e6e8e; arktype 2.2.9
from npm (`moltar/v2`).

**C, deterministic.** No statistics. A count holds if max/min ≤ 1.001 over 3
reps.

1. Instructions per call, in benny's call shape (`moltar/cjs/child.ts`), for
   moltar's four cases × {B1, B2, dynamic}, and the libraries ranked near
   ArkType on moltar's published results (`arms.ts`). Also 2.2.9 on the strict
   cases, and schema-benchmarks' valid-data validation for B1 and dynamic
   (`sb/`).
2. Bundle sizes of valibot.dev's login form as written, with its messages
   (`login/size.ts`): B1, B2, default+lean (B1 with the validator's members
   off), dynamic, Valibot, Zod Mini, Zod, and ajv's standalone code.
3. `pnpm benchValidate`, which drives the homepage's benchmark: 150 rounds
   plus one replication.

**H, wall clock.** One run of 30 passes (`wall.ts`). Each pass runs every arm
once, in a random order, each in its own process pinned to cores 10-15. A
pass starts only while the 1-minute load is under 4. The family is Holm over
four hypotheses at α 0.05 (thresholds 0.0125, 0.0167, 0.025, 0.05). H1 and H2
are intersection-union tests: the p is the largest over every rival within
25% of B1's instruction count.

| #   | hypothesis                                                                           | pairs                                                                                        | test                                              |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| H1  | B1 is faster than every rival on moltar's parseSafe                                  | @ts-runtypes, typia, ata-aot, ata, rescript-schema, @sx3/gate                                | two-sided sign test per pair, p = max             |
| H2  | B1 is faster than every rival on moltar's assertLoose                                | ts-runtime-checks, ts-auto-guard, type-predicate-generator, TypeBox AOT, typia, @ts-runtypes | same                                              |
| H3  | dynamic is not slower than B1 by more than 5% on schema-benchmarks' valid validation | dynamic vs B1                                                                                | one-sided sign test on per-pass dynamic/B1 < 1.05 |
| H4  | dynamic is more than 5x faster than 2.2.9 on moltar's assertStrict                   | dynamic vs 2.2.9                                                                             | one-sided sign test on per-pass ratio < 0.2       |

**Decision rules.**

- With 30 passes, the first Holm step needs 23 of 30 (p 0.0052).
- No reruns, and no pair added or dropped after the data.
- If H1 or H2 fails, its sentence falls back to what C1 proves: the fewest
  instructions per call on that case, in our runs.
- If H3 fails, the claim that dynamic ArkType is as fast as precompiled goes.
- If H4 fails, the strict speedup over 2.2 is stated in instructions, from
  C1.
- Every pass's ratios are published with the run.

## Running it

From the repo root, after `pnpm build`, with perf, a moltar clone whose
compiled cases are built, and a schema-benchmarks clone with its dependencies:

```sh
npm i --prefix ark/repo/bench/external/moltar/v2
node ark/repo/bench/external/moltar/build.ts
SB=<schema-benchmarks> SB_MODULES=<its node_modules> node ark/repo/bench/external/sb/bundle.ts
MOLTAR=<moltar> NODE24=<node 24.14.1> node ark/repo/bench/external/arms.ts
node ark/repo/bench/external/count.ts <counts.json> 3
node ark/repo/bench/external/wall.ts <wall.json> 30
node ark/repo/bench/external/stats.ts <wall.json>
node ark/repo/bench/external/login/size.ts <sizes.json>
```

## The release candidate's run

`results/` holds the run at c42ee008c, on a shared 16-core machine: the arms
as run (`arms.json`), the counts (`counts.json`, `counts.md`), the sizes
(`login.json`, esbuild 0.28.2) and the wall-clock passes (`wall.json`, with
every pass's ratios in `wall.md`). The wall run took 30 passes from 06:46 to
07:17 UTC; the gate held two passes back at loads of 7.2 and 5.0, and pass 3
ended at 5.2.

| test | result                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1   | **fails** (p 1): B1 beat @ts-runtypes, typia, ata-aot and ata in 26-28 of 30 passes, but rescript-schema and @sx3/gate were faster in 21 and 24 (B1 took 1.04x and 1.05x their time) |
| H2   | holds (p 0.0052 ≤ 0.0167): its closest pair, ts-runtime-checks, 23 of 30, 0.93x                                                                                                      |
| H3   | holds (p 0.0081 ≤ 0.025): dynamic/B1 0.998, under 1.05 in 22 of 30                                                                                                                   |
| H4   | holds (p 9.3e-10 ≤ 0.0125): dynamic/2.2.9 0.078, under 0.2 in 30 of 30                                                                                                               |

C1 holds its ranks: B1 takes the fewest instructions on parseSafe (189 vs
@ts-runtypes 209, typia 213) and assertLoose (66 vs ts-runtime-checks 74).
The parseSafe cells miss the 1.001 gate by up to 0.0023 (0.3 instructions),
which reorders nothing. 2.2.9's strict counts vary by 14-16% between reps, so
their ratios to dynamic span 11.2x to 13x. C2: B2 is 1312 B gzipped, Valibot 1547.

At 3eb166a9c, a fix that keeps union merges from dropping branch descriptions
grew dynamic ArkType's login bundle to 80041 B gzipped
(`results/login-3eb166a9c.json`). Every other size is unchanged.

At be45edabb, dynamic ArkType's login bundle is 80672 B gzipped and B2 is
1313 (`results/login-be45edabb.json`). Every other size is unchanged.

## The release's deterministic re-run

At the release, f29b8d153, `results/login-f29b8d153.json` holds the login
form's sizes: B2 is 1315 B gzipped (Valibot 1547), B1 1779 and dynamic
ArkType 82263. `results/counts-a306152ce.{json,md}` holds C1 at a306152ce,
whose builds f29b8d153 doesn't change (it differs only in how a scope caches
a keyword bound to it). B1 still takes the fewest instructions on parseSafe
(184, from 189; @ts-runtypes 209, typia 213) and assertLoose (66;
ts-runtime-checks 74). Dynamic ArkType's parseSafe fell from 262 to 216, and
B2's assertLoose rose from 71 to 3220, since the size build now checks with
small shared checkers. 2.2.9's strict counts vary by 20-26% between reps, so
dynamic's ratios to them span 10.2x to 17.1x. The wall-clock run above is
still the release candidate's.
