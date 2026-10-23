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

## The release's wall-clock run

`results/wall-f29b8d153.{json,md}` is the same plan's run at the release,
f29b8d153, with the same arms and builds (B1, B2 and schema-benchmarks' B1
bundle are byte-identical to a306152ce's): 30 passes from 09:26 to 10:11 UTC,
starting at 1-minute loads of 1.0-4.0, with pass 8 ending at 6.3. Every
hypothesis holds.

| test | result                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| H1   | holds (p 8.7e-7 ≤ 0.0167): every pair 28-29 of 30; rescript-schema 0.90x, @sx3/gate 0.92x, @ts-runtypes, typia, ata-aot and ata about 0.83x |
| H2   | holds (p 0.0014 ≤ 0.05): its closest pair, ts-runtime-checks, 24 of 30, 0.94x                                                               |
| H3   | holds (p 0.00072 ≤ 0.025): dynamic/B1 0.999, under 1.05 in 24 of 30                                                                         |
| H4   | holds (p 9.3e-10 ≤ 0.0125): dynamic/2.2.9 0.074, under 0.2 in 30 of 30                                                                      |

At 89510709d, a leaner error writer shrank B2's login form to 1313 B gzipped
(`results/login-89510709d.json`); every other size is unchanged.

## Cold start

`startup.ts` counts what a fresh process spends from just before it imports
an app's bundle to just after its first validation of valid data returns:
perf's user-space instructions over every thread, with no compile cache.
Each app is bundled as request handlers read it, one handler per validator
returning the data or the issues, with bench/bundle.ts's esbuild settings as
a production build. ArkType is precompiled with each of `STARTUP_BUILDS`'
options, so a production build prunes what the handlers don't read. The
apps are the homepage's login, moltar and shop, and valibot.dev's login form
(`startup/form`, against the libraries that write it). A baseline bundle
that validates nothing gives the cost of loading any module; counts less it
are what a library adds.

The plan, fixed before any count: 20 rounds, each running every arm once in a
rotated order. An ArkType build has the fewest instructions on an app if it
has fewer than every other library in a two-sided sign test paired by round
at p < .05. A claim needs Node 24 and 25 to agree, and a wall-clock sentence
needs the same test on 30 rounds of `STARTUP_WALL=1`, timed one process at a
time while the 1-minute load is under 4.

Every bundle's path has the same length and every process runs in `/`: the
first run, from `ark/repo` with bundles named by library, found Node's loader
costing about 0.37M more instructions past some length of directory plus file
name. Only ajv's shorter names stayed under it, so that run favored ajv; it
is superseded.

From the repo root, after `pnpm build` and bench/generateTypia.ts:

```sh
STARTUP_BUILDS='{"default":{},"optimizeErrors":{"optimizeErrors":"size"}}' \
	STARTUP_NODE=<node> node ark/repo/bench/external/startup.ts <out.json> 20
```

At 4fd880692 (`results/startup-4fd880692-node{24,25}.json`, builds `default`,
`optimizeErrors: "size"` as `oe`, `oe` with `lazy: false` and `"smallest"`),
every build has the fewest instructions on the form, 20 of 20 against each
library on both Nodes, and on the login app, 19 or 20 of 20 against all
seven: `oe` adds 1.28M on Node 24 where ajv adds 1.86M, Valibot 2.35M and
Typia 2.43M (gross 4.95M against ajv's 5.52M). On moltar Typia adds fewer
(1.16M against `oe`'s 1.39M), and on shop Valibot does (12.26M against
14.29M), except against `"smallest"` (9.09M). No wall-clock run yet.

## Best average

The headline's superlatives come from this rule, written before any average
was computed. A library is the fastest, the quickest to start or the
smallest if it has the best average in that category across the public
benchmarks below.

**Categories and benchmarks.** Each category is a set of suites, each suite a
set of rows. A row is one measured result per library; lower is better on
every row.

| category | suite                                       | rows                                              | measure                                                               |
| -------- | ------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| speed    | moltar's typescript-runtime-type-benchmarks | parseSafe, parseStrict, assertLoose, assertStrict | instructions per call (`results/counts-*.json`)                       |
| speed    | the homepage's benchmark                    | its 32 scenarios                                  | median ns per call (`ark/docs/lib/bench/benchData.json`)              |
| startup  | `startup.ts`                                | its scenarios on Node 24                          | median instructions, less the baseline bundle's (`results/startup-*`) |
| startup  | the homepage's cold start                   | its apps                                          | median ms from import to first validation (`benchData.json`)          |
| size     | valibot.dev's login form                    | the form, written in each library (`forms/`)      | gzipped bytes (`results/forms-*.json`)                                |
| size     | the homepage's apps                         | its apps                                          | gzipped bytes (`benchData.json`)                                      |

schemabenchmarks.dev isn't a suite: our reproduction (`sb/`) runs only
ArkType. The wall-clock runs aren't either: they time a subset of moltar's
rows and libraries that the counts already cover.

**ArkType's build.** One config everywhere: the default options in a
production esbuild build, which prunes by usage. Where a suite bundles,
every library is bundled the same way. ArkType's other builds (the
"smallest" preset, errors: "first", dynamic, 2.2.9) are left out of every
row, including when finding a row's best. The homepage's size and cold-start
rows were bundled for development, so before averaging they are rebuilt and
remeasured with every library in production (`bench/bundle.ts`); its speed
rows run ArkType's validators as precompiled, which pruning doesn't change.
The login form is remeasured at the same commit.

**Libraries.** Every library in any suite. A library's variants in one suite
(a mode in parentheses after its name, as in moltar's TypeBox and ata
cases, or the form's TypeBox TypeCompiler and Value) count as that library,
by its best variant on each row; Zod, Zod Mini and z.compile stay three, as the homepage names
them.

**Average.** On each row, a library's ratio is its result over the best
result any library has on that row. Its score in a suite is the geometric
mean of its ratios over the suite's rows it's measured on, and its score in
the category is the geometric mean of its suite scores, so each suite weighs
the same however many rows it has. The best score wins the category.

**Coverage.** A library's suite score counts only if it's measured on at
least half that suite's rows. It's ranked in a category only if it has a
counted score in at least half of the category's suites.

**Use.** `ark/repo/bench/external/leaderboard.ts` gathers every row into
`ark/docs/lib/bench/leaderboard.json`; `ark/docs/lib/claims.ts` computes the
scores from it and throws if the headline claims a category ArkType doesn't
win. Nothing is rerun to change a result.
