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

At 5acd85130, dynamic ArkType's login bundle is 82946 B gzipped
(`results/login-5acd85130.json`), from 82263 at f29b8d153: checking UUIDs, IP
addresses and ISO dates by their char codes added 779, and declaring arkregex
free of side effects took 17 back. Only that row is cited from this file. Its
precompiled rows are pruned by usage and assert the form (1edc2a765), so they
aren't the chart's.

## The homepage's apps

`bench/size.ts` sizes each of the homepage's apps as `bench/bundle.ts`
bundles it: the app's exports, minified by esbuild with the `"production"`
condition and gzipped. Every library is bundled the same way, as a
production build ships. At e9e6ebc10 only the `"smallest"` preset's bundles
had the condition, so the default build was sized as a development build,
without the usage pruning a production build does: login 1809 B gzipped,
moltar 1885, shop 9445 and saas 16030. As production builds they are 1649,
1680, 7057 and 12374. No other library's bundle changes.

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

Which public suites belong in the table is decided by the rule under
"Which suites" below, which adds schemabenchmarks.dev, Sury's schema
benchmark and ata's validator-benchmarks. The wall-clock runs aren't suites:
they time a subset of moltar's rows and libraries that the counts already
cover.

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

### The first average, at 642b4517e

`ark/docs/lib/bench/leaderboard.json`; the score is the geometric mean of
ratios to each row's best, so 1 is best everywhere.

| category | 1                    | 2             | 3                   | 4              | 5                         |
| -------- | -------------------- | ------------- | ------------------- | -------------- | ------------------------- |
| speed    | @ts-runtypes 1.101\* | ata 1.141\*   | ArkType 1.211       | paseri 1.302\* | ts-runtime-checks 1.330\* |
| startup  | ArkType 1.083        | Valibot 1.256 | ajv 1.385           | Typia 1.402    | Zod Mini 3.395            |
| size     | ajv 1.160            | Valibot 1.588 | Superstruct 1.736\* | Typia 1.812    | ArkType 2.069             |

\* ranked on one of the category's two suites. ArkType has the best score in
each speed suite on its own (moltar's 1.067, the homepage's 1.375), but
@ts-runtypes and ata are only in moltar's, so the rule averages ArkType's
homepage score in and not theirs. So only startup backs a superlative.

One deviation: the homepage's cold-start rows weren't remeasured in
production. The 1-minute load stayed above 15 for 40 minutes; a run at 16-22
put every arm at 4x its quiet time and tied all of them. The quiet,
development-built rows stand, which only handicap ArkType (its build there
isn't pruned). With the loaded production rows instead, startup's order is the
same: ArkType 1.098, Valibot 1.289.

### Which suites

A skeptic's first question is why these suites. This rule, written at
2026-10-23T22:12Z before any search for suites and before ArkType's standing
in any suite not above was seen, decides it. A suite counts in a category iff:

1. its harness and its results are public;
2. its harness or its published results changed in the last 12 months;
3. it measures the category on runtime validators: time or instructions per
   validation or parse (speed), to create a schema or import and first
   validate (startup), or bytes of bundles that use a validator (size).
   Type-checking time and memory are other categories;
4. it measures both Zod and Valibot, so it compares the field rather than two
   libraries;
5. it runs locally from its own steps, plus adding a library the way it adds
   one. One that can't is listed with its published results, outside the
   average.

Who runs a suite doesn't matter: a library author's benchmark counts as ours
does. Rows are the suite's own, in its own measure, except that wall-clock
rows are counted in instructions while the machine's 1-minute load is 4 or
more, as moltar's are here. ArkType enters each as the default build, added
the way the suite adds a library; where a suite already has `type()`, that
arm is dynamic ArkType and is left out like ArkType's other builds.

| suite                                          | run by                   | verdict                                                                                                           |
| ---------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| moltar's typescript-runtime-type-benchmarks    | moltar                   | in (speed)                                                                                                        |
| schemabenchmarks.dev (open-circle)             | Open Circle              | in: speed (26 rows), startup (initialization), size (download)                                                    |
| Sury's schema benchmark (`docs/benchmarks`)    | Sury's author            | in: speed (parse), startup (build and parse once), size (what the schema ships); its whole-library row is out (3) |
| ata's validator-benchmarks                     | ata's author             | in (speed, 12 rows)                                                                                               |
| the homepage, `startup.ts`, valibot.dev's form | us, and Valibot's author | in                                                                                                                |
| Zod's published comparisons                    | Zod's author             | out as a suite: its cross-library numbers are moltar runs, its sizes Zod against Zod Mini (4)                     |
| typia's `benchmark/`                           | typia's author           | out: no Valibot (4)                                                                                               |
| TypeBox's benchmarks                           | TypeBox's author         | out: ajv only (4)                                                                                                 |
| icebob/validator-benchmark and smaller repos   | various                  | out: unchanged since 2024 or before (2)                                                                           |
| blog comparisons, bundlephobia, pkg-size       | various                  | out: no harness, or the whole package rather than a bundle using it (1, 3)                                        |

How each new suite is run, at the commits measured (schema-benchmarks
94e2dccc on Node 26.12.1, its `.node-version`; Sury 1f035c5 and ata's
8676ca6 on Node 24.14.1, with their own pinned installs):

- schemabenchmarks.dev: `sb/precompiled/` is added to the clone as
  `schemas/libraries/arktype/precompiled/`, as zod-compiler is added: its
  generate.ts compiles the arktype entry's schema with the suite's tsdown
  config and the precompile plugin (with `node_modules/arktype` linked to
  this repo's `ark/type`), and `sb/download.patch` adds the plugin to the
  download test for that entry, as typia's is. Rolldown and tsdown can't tell
  the plugin a build is for production, so it's given what the default
  resolves to in one: `prune: true` and the production defaults. After
  `vp pack --no-dts` in `schemas`, `sb/allArms.ts` lists every runtime case of
  every library and `count.ts` counts them (`COUNT_ARMS=out/sb-arms.json`);
  the download test is the suite's own script.
- Sury's: `sury/cases.ts` is its schema topic's timed calls verbatim,
  bundled against its installs, and `sury/arktype.ts` the same ArkType calls,
  precompiled (`sury/bundle.ts`, `sury/arms.ts`, then `count.ts`).
  `sury/size.ts` is its bundle-size code with its esbuild, each bundle run on
  its value before it's counted; ArkType's snippet is a file, `sury/schema.ts`,
  since the precompiler doesn't read esbuild's stdin.
- ata's: `ata/validators.ts` writes its user and order bodies in ArkType,
  `ata/build.ts` precompiles them, and `ata/impls.patch` adds an adapter as
  typia's is added. `ata/arms.ts` and `count.ts` count instructions per
  document; a child exits where an adapter disagrees with a scene.

Two startup rows time no build for a library that compiles ahead of time:
schemabenchmarks.dev's initialization and Sury's build-and-parse-once.
ArkType's default build creates a validator once and reuses it (42 and 106
instructions; typia's createIs 381), so on those rows it wins by what the
rows don't measure. They're the suites' rows, so they stay.

### Every qualifying suite, at 6c5fd9862

lane/homepage with lane/integrate 3381cbce3. Each suite's rivals were counted
at 4971a30a1 and ArkType's arms again at 6c5fd9862 (no rival depends on the
build). `results/sb-counts-*`, `sb-download-*`, `sury-counts-*`,
`sury-size-*` and `ata-counts-*`; `node standings.ts [suites]` prints the
standings over any set of suites.

| category | 1             | 2                   | 3             | 4             |
| -------- | ------------- | ------------------- | ------------- | ------------- |
| speed    | ata 1.151\*   | ArkType 1.186       | ajv 2.645\*   | Typia 3.449\* |
| startup  | ArkType 1.041 | Typia 2.602\*       | Valibot 27.3  | Zod Mini 59.7 |
| size     | Valibot 1.349 | Superstruct 1.464\* | Typia 1.570\* | ArkType 1.699 |

\* ranked on 2 to 4 of the category's suites. Each suite's own scores:
ArkType has the best score in every speed suite but schemabenchmarks.dev
(1.468, ata 1.154), and the best in every startup suite but the homepage's
cold start (1.054, Valibot 1.050). In size it's best in none: the login form
1.705 (ajv 1.000), the homepage's apps 2.511 (ajv), schemabenchmarks.dev's
download 1.657 (2598 B against @railway-ts/pipelines' 1568, Typia 1846,
Valibot 2058), Sury's 1.174 (1531 B against Valibot's 1304).

Speed turns on schemabenchmarks.dev's string formats and invalid Standard
Schema row, where ata's checks take a fraction of ArkType's instructions:
uuid 27 against 227 invalid (8.3x) and 495 against 1137 valid, date-time 95
against 268 invalid, ipv6 266 against 709 invalid, and Standard Schema's
invalid row 57308 against Sury's 31528 (1.8x). ata isn't in the homepage's
suite, where ArkType's score is 1.375. Leaving out one suite at a time,
ArkType leads speed without the homepage's (1.143, ata 1.151) or without
schemabenchmarks.dev (1.125), and ata leads otherwise.

### ArkType's rows at 90d510484

Every ArkType row was measured again on one commit, 90d510484, the default
build in every suite: `results/arktype-90d510484.json` holds them in each
suite's own format, and `leaderboard.ts` puts them over each suite's
rivals, which don't depend on ArkType's build. `startup.ts` was run whole
there (`results/startup-90d510484-node24.json`), rivals included. The
homepage's apps are sized as production builds (`bench/bundle.ts`, above).

The homepage's speed rows are now instructions per call (`count.ts`), as
"Which suites" counts wall-clock rows measured at a 1-minute load of 4 or
more, which it was. Its rivals are the counts at 54777c69a
(`results/homepage-counts-54777c69a.json`): ajv, Valibot and z.compile.
Zod, Zod Mini, Typia and TypeBox aren't counted there, so their speed scores
average one suite fewer. None of them is fastest on any of the suite's rows
by wall clock, so ArkType's score doesn't depend on them. With the suite in
`benchData.json`'s median ns, every library in, ArkType still leads speed
(1.116 against ata's 1.253 with 7daf33b7e's rows). The homepage's cold
start is still its quiet, development-built ms.

| category | 1             | 2             | 3                   | 4             |
| -------- | ------------- | ------------- | ------------------- | ------------- |
| speed    | ArkType 1.096 | ata 1.251\*   | Typia 2.767\*       | ajv 2.876\*   |
| startup  | ArkType 1.013 | Typia 2.791\* | Valibot 29.2        | Zod Mini 64.7 |
| size     | ArkType 1.372 | Valibot 1.400 | Superstruct 1.464\* | Typia 1.570\* |

\* ranked on 2 to 4 of the category's suites. ArkType has the best score in
every speed suite: moltar's 1.067, the homepage's 1.251, schemabenchmarks.dev's
1.078 (ata 1.485), Sury's 1.000 and ata's 1.097 (ata 1.156). It has the best
in every startup suite but the homepage's cold start (1.054, Valibot 1.050),
and the fewest instructions on all four of `startup.ts`'s apps. In size it's
best in Sury's (1124 B, Valibot 1304) and second to ajv on the login form
(1172 B; ajv 935, Typia 1252); the homepage's apps 2.118 (ajv 1.346, Valibot
1.508) and schemabenchmarks.dev's download 1.336 (2095 B against
@railway-ts/pipelines' 1568, Valibot 2058). Its size lead is 2.0%.

At 7daf33b7e, the commit before, size was Valibot 1.360 against ArkType
1.462, with speed 1.092 and startup 1.014 leading.

### ArkType's rows at fea8e68e0, the homepage's speed in ns

The homepage's speed suite is scored by the table's measure again, median
ns per call from `benchData.json`, every library from one run. Counting it
in instructions under load (above) changed the registered row, so that
section's homepage scores stand only as its record;
`results/homepage-counts-*.json` are kept with it. `benchData.json`'s
scenarios were rerun at fea8e68e0 on a quiet machine: 20 passes, then a
10-pass replica, by its provenance's procedure, at 1-minute loads of 2.1 to
3.4 at the runs' starts and ends. Its sizes and cold start aren't rerun.
Every other ArkType row was measured again at the same commit
(`results/arktype-fea8e68e0.json`, `results/startup-fea8e68e0-node24.json`).

| category | 1             | 2             | 3                   | 4             |
| -------- | ------------- | ------------- | ------------------- | ------------- |
| speed    | ArkType 1.105 | ata 1.249\*   | ajv 2.866\*         | Typia 3.675\* |
| startup  | ArkType 1.013 | Typia 2.815\* | Valibot 29.4        | Zod Mini 65.2 |
| size     | ArkType 1.363 | Valibot 1.404 | Superstruct 1.464\* | Typia 1.570\* |

\* ranked on 2 to 4 of the category's suites. ArkType has the best score in
every speed suite: moltar's 1.067, the homepage's 1.298 (ajv 1.972),
schemabenchmarks.dev's 1.078 (ata 1.480), Sury's 1.000 and ata's 1.104 (ata
1.155). Startup is as at 90d510484, Valibot best only on the homepage's cold
start. In size it's best in Sury's (1112 B, Valibot 1304) and second to ajv
on the login form (1168 B); the homepage's apps 2.100 (ajv 1.346, Valibot
1.508) and schemabenchmarks.dev's download 1.315 (2062 B). Leads: speed
13.0%, startup 178%, size 3.0%.

### ArkType's rows at 808927feb

The same measurements at 808927feb, after the first issue began to be pushed
directly (a size trade) and object issues began to be reported in
declaration order: `benchData.json`'s scenarios rerun, 20 passes then a
10-pass replica, every library in, at 1-minute loads of 2.3 to 4.9 at the
runs' starts and ends (each started under 4); every other ArkType row in
`results/arktype-808927feb.json` and `results/startup-808927feb-node24.json`.

| category | 1             | 2             | 3                   |
| -------- | ------------- | ------------- | ------------------- |
| speed    | ArkType 1.103 | ata 1.255\*   | ajv 2.873\*         |
| startup  | ArkType 1.013 | Typia 2.815\* | Valibot 29.4        |
| size     | ArkType 1.355 | Valibot 1.405 | Superstruct 1.464\* |

\* ranked on 2 to 4 of the category's suites. The homepage's speed suite is
ArkType 1.282, ajv 1.963. Size: the login form 1158 B, the homepage's apps
2.095, schemabenchmarks.dev's download 2037 B (1.299), Sury's 1107 B. Leads:
speed 13.8%, startup 178%, size 3.7%.

## The login form across validators

`forms/` writes valibot.dev's login form in each TypeScript-schema validator
with real usage, as its docs write it, each exporting a validate that reports
every error with the form's messages where the library can attach them
(typia can't, so it keeps its own). `forms/size.ts` bundles each with
login/size.ts's esbuild settings, gzips at level 9, then runs every bundle on
the same four inputs and records what it reports. ajv's row is its standalone
code with ajv-errors: generated from JSON Schema, not a TypeScript schema.

At 54eb5e89b (`results/forms-54eb5e89b.json`, behavior in
`results/forms-behavior-54eb5e89b.json`), gzipped: ArkType precompiled with
the "smallest" preset 1119, ajv standalone 935, typia 1252, ArkType default
1552, Valibot 1564, Superstruct 1623, runtypes 5051, Zod Mini 5124, Yup 13519,
TypeBox 22788 (TypeCompiler) and 25697 (Value), Zod 25076, Joi 54732, dynamic
ArkType 82262, Effect Schema 83215. On a blank password ArkType reports only
the 8-character message: `string > 0` is implied by `string >= 8`, so its
message never fires.
