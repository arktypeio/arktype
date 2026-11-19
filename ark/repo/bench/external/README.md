# External benchmarks

The site's speed and size claims outside the homepage's own benchmark
(`ark/docs/lib/claims.ts`) come from runs of other projects' benchmarks. This
directory holds what those runs need beyond the projects themselves, and the
plan they follow, written before the release candidate's data existed.

## Reproduce

Every row on the leaderboard comes from one of these commands, run from a
clean checkout after `pnpm i && pnpm build`, on Linux with `perf` and
`taskset`:

```sh
NODE24=<node 24.14.1> NODE26=<node 26.12.1> pnpm benchExternal <suite>
pnpm benchExternal <suite> --latest # its rivals at their 2026-10-24 releases
pnpm benchExternal <suite> --newest # its rivals at their newest releases, kept in results/newest/
pnpm benchValidate # the homepage's speed rows
pnpm benchSize # the homepage's app sizes
pnpm benchScale # the "smallest" preset's sizes
pnpm benchImport # the homepage's cold start
pnpm benchBoard --fresh # the homepage board's numbers, published beside what those runs measured
```

`benchBoard` prints each of the homepage board's three graphs by the rule in
`ark/docs/lib/bench/units.ts`, which is the code the site draws them with:
the geometric mean of each library's results, in the unit they were measured
in, over the largest set of other projects' results that ArkType, Zod and
three more named libraries all ran, and its place among every library that
ran all of them. Under them it prints our own benchmark's speed, cold start
and app sizes the same way. With `--fresh` each table has a second column
from `out/fresh/leaderboard.json`, `bench/out/validate.json`, `import.json`
and `size.json`, wherever a run above has written one.

`<suite>` is `moltar`, `sb`, `sury`, `ata`, `form`, `startup`, `size` or
`all`, where `size` is the form and the download and bundle rows of
schemabenchmarks.dev and Sury, without counting anything.
`benchExternal` clones each external suite at the commit its rows were
counted on into `out/clones/`, installs it from its own lockfile, adds
ArkType as "How each new suite is run" describes, counts every arm into
`out/fresh/`, and prints the standings over the fresh rows beside the
published ones. Here `all` takes about 90 minutes: schemabenchmarks.dev 45,
ata's 30, moltar's 10, Sury's 3, the form and `startup.ts` one each. If
ttsc's first Go build of typia's plugin fails, run the suite again.
`count.ts` and `startup.ts` pin each process to cores 10-15: on a machine
without them, name its own as `COUNT_CORES` and `STARTUP_CORES`.

@ts-runtypes is no longer rerun. Its packages were removed from npm on or
before 2026-11-19, so moltar's suite, whose lockfile names them, no longer
installs as it's pinned or at its newest commit. `reproduce.ts` takes the
library out of the clone as it checks it out, and a run from that date has no
`@ts-runtypes` arm. The leaderboard keeps the counts stored while it could be
installed, at 0.10.0 and 0.12.2.

The published rows were counted on an Intel i7-11700 (8 cores, 16 threads)
under WSL2 (Linux 6.18, perf 6.18), pinned to cores 10-15, on Node 24.14.1
for moltar's, Sury's and ata's suites and `startup.ts`, 26.12.1 for
schemabenchmarks.dev (its `.node-version`) and 25.2.1 for the homepage's
benchmark.

**Monthly.** `.github/workflows/leaderboard.yml` runs on the first of each
month on a GitHub-hosted runner, with ArkType at main and each rival at its
newest release. It changes nothing by itself: what it measures reaches the
site only when a maintainer merges the pull request it opens. It reruns the
benchmarks whose result is bundle bytes, which a shared runner measures to
the byte:

- `pnpm benchExternal size --newest`, which keeps the run in
  `results/newest/`, with each suite's commit, date and installed versions in
  `run.json`, and rewrites `ark/docs/lib/bench/leaderboard.json`, where each
  rival keeps its smaller bundle of its pinned, 2026-10-24 and newest
  installs, ArkType's rows are the run's and `measured` is the run's date,
  which the site prints as "Standings as of". A rival with a build step
  moves with the packages it builds on (`newest.ts`): typia with ttsc and
  ttsc's unplugin, at the versions typia's newest release requires. A suite
  that fails is run once more, then with each such rival at the last release
  the suite built: `run.json` records it as `held`, and the pull request
  says "newest X not buildable in <suite>, kept Y". If that fails too, the
  run fails.
- `pnpm benchScale`, which rewrites `ark/docs/lib/bench/presetScale.json`,
  the "smallest" preset's sizes.

`monthly.ts` does the rest. If the rerun measured and installed nothing new (a
new date and commit alone don't count), the run passes and opens nothing.
Otherwise it commits the files the rerun wrote to `bench/monthly-standings`,
forced from the commit measured, and opens the pull request "bench: monthly
standings" against main, or rewrites the body of the one already open. The
body has the date and commit measured, each rival's version before and
after, every number that changed with its difference, each place that moved
on the board (`standings.ts`), the site's claims (`ark/docs/lib/bench/headline.ts`)
before and after, what wasn't rerun and the run's link, whose `leaderboard`
artifact holds every file. A headline that changes, or a claim `claims.ts`
throws on, comes first. The text the docs build writes from the numbers and
checks in (`llms.txt` and its like, `ark/docs/lib/writeMarkdown.ts`) is
written again in the same commit, only the files the numbers changed.

Not rerun, and not stood in for: the speed and startup suites count
instructions with perf, which needs hardware counters only some hosted
runners' hosts expose, so a scheduled run leaves them to
`pnpm benchExternal all --newest` on a machine that has them. It keeps its
counts in `results/newest/` the same way, `startup.ts`'s among them, which
the leaderboard reads in place of the committed startup run:
`startup.ts` bundles the repo's own dependencies, so its rivals are at the
versions `pnpm-lock.yaml` pins. The homepage's speed and cold-start rows are
wall clock, which a shared runner can't time. `pnpm benchSizeScale` is
bytes too, but took 29 minutes and 13 GiB of memory at its peak on an Apple M5
Max, more than a hosted runner's 16 GiB leaves it. To count
instructions in the workflow, dispatch it with `suites: all`. Its first step
fails on a hosted runner whose host exposes no counters (measured
2026-11-19: Intel Xeon under KVM and arm64 Neoverse count, AMD EPYC under
Hyper-V doesn't), and it's dispatched again; or name as `runner:` the label
of a self-hosted Linux runner with perf and taskset. A scheduled
run reads the repository variables `LEADERBOARD_SUITES` and
`LEADERBOARD_RUNNER` for the same.

What GitHub requires of it:

- A scheduled workflow runs only from the default branch's copy of its file,
  so the monthly run measures main. Dispatched on another branch, it measures
  that branch and opens its pull request against it, from
  `bench/monthly-standings-<branch>`.
- The repository setting "Allow GitHub Actions to create and approve pull
  requests" (Settings > Actions > General > Workflow permissions) must be on.
  Where it's off, the run pushes the branch and fails, naming the setting.
- A pull request opened with the workflow's token triggers no other
  workflow, so `pr.yml` runs on it only once someone closes and reopens it or
  pushes to its branch. Its body says so.

**Expected variance.** Load doesn't move an instruction count, but a run's
tiering and garbage collection do. Every suite rerun from a clean clone
(2026-10-24) against the committed rivals' counts: moltar's 62 arms, 61
within 1% and the last 3%; schemabenchmarks.dev's valid-data arms, 96% of
207 within 3% and all within 11%, while arms that build error objects move
up to 40% (typia's invalid createValidate 0.59x, its invalid Standard Schema
1.47x); Sury's parse arms within 3%, its build arms, which allocate, up to
18%; ata's 119 arms, 94% within 3%, the worst 1.44x (ata's own errors on the
config body). Every bundle size reproduced to the byte, and no top-two
score moved by more than 0.009 (Typia's startup, 2.815 to 2.824). On another CPU or Node build, expect each
arm's count to shift by a few percent and ratios by less. The homepage's
speed rows are wall clock, so compare their ratios, not their nanoseconds.

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
free of side effects took 17 back (`results/login-1e74181e4.json`, before that,
has 82965). Its precompiled rows are pruned by usage and assert the form
(1edc2a765): the default build (B1) is 1140 B and the `"smallest"` preset
(B2) is 1037 B. Its earlier 1313 was B2 at 89510709d, before builds pruned by
usage, as B1's 1779 was. The docs' size chart and `loginSize` read the row
"Best average" ranks instead, `forms/arktype.ts` in `leaderboard.json`: the
same form with the same esbuild settings, which exports a function that
asserts where `login/arktype.ts` asserts once, 917 B at ba691ac56.

At 20710020e (`results/login-20710020e.json`), the default build was 1007 B
gzipped, the `"smallest"` preset 978 and dynamic ArkType 89751; Valibot 1547,
Zod Mini 5127 and Zod 25058 were unchanged. Every other ArkType row was
measured again on the same commit (`results/arktype-20710020e.json`,
`results/startup-20710020e-node24.json`, Typia included, and
`results/newest/`, every rival at its newest release of 2026-11-06), at
1-minute loads of 6 to 12.

ArkType's size rows, and only those, were measured again at ba691ac56
(`results/newest/` and `results/arktype-ba691ac56.json`), and they are the
ones published: `forms/`'s default build is 917 B gzipped, its `"smallest"`
878 and its dynamic build 97987, where they were 1026, 996 and 89767 at
20710020e. `login/` wasn't rerun there. The instruction counts are still
20710020e's, and each suite's `measured` in `leaderboard.json` names its
commit.

## The smallest preset's speed

`results/smallest-3f6c3c32b.json` holds B2, the `"smallest"` preset, on
moltar's four cases at 3f6c3c32b, beside B1 and moltar's own Valibot and Zod
cases (`cases/valibot.ts` and `cases/zod.ts` at 499f3fb), on Valibot 1.5.0
and Zod 4.6.7. It was counted on 2026-11-06 from 14:08 to 14:11 UTC, at
1-minute loads of 18 to 20, by `count.ts` over 3 reps on Node 24.14.1,
pinned to cores 10-15, of the arms `moltar/smallest.ts` writes. Each runs
`moltar/cjs/child.ts`'s call shape on moltar's data, without a clone of
moltar's. On B1 it counts 217, 337, 69 and 332 instructions where moltar's
harness counted 184.6, 339, 66 and 332 at 20710020e, whose B1 counts the
same as 3f6c3c32b's here, so its rows can differ from that harness's by up
to 18%. Medians, in instructions per call:

| case         | B1 (default) | B2 (`"smallest"`) | Valibot | Zod 4 |
| ------------ | -----------: | ----------------: | ------: | ----: |
| parseSafe    |          217 |              8605 |    8299 |  1086 |
| parseStrict  |          337 |              4451 |    9533 |  2171 |
| assertLoose  |           69 |              3179 |    8218 |  2087 |
| assertStrict |          332 |              4402 |    9450 |  2101 |

B2 takes 4% more instructions than Valibot on parseSafe and 2.1-2.6x fewer
on the other three, while Zod 4 takes 1.5-7.9x fewer than B2 and B1 13-46x
fewer. Zod's counts vary by up to 9% between reps, every other arm's by
under 1%. From the repo root, after `pnpm build`:

```sh
node ark/repo/bench/external/moltar/build.ts
NODE24=<node 24.14.1> node ark/repo/bench/external/moltar/smallest.ts
COUNT_ARMS=ark/repo/bench/external/out/smallestArms.json \
	node ark/repo/bench/external/count.ts <out.json> 3 2
```

These replace B2's rows in `counts.json` (c42ee008c) and
`counts-a306152ce.json`, which predate ca800dff2. From it, a checker can
delete or reject a key it doesn't declare, so B2 writes `tSafe` and
`tStrict` as checkers too, where it had compiled them, as it had compiled
every Type at c42ee008c.

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

The published rows are the default build's at 781130da3
(`results/startup-781130da3-node24.json`): the fewest instructions on every
app against every library run, 20 of 20 each. Net of the baseline, the form
is 0.91M against Valibot's 2.37M, the login app 0.89M against ajv's 1.86M,
moltar 0.95M against ajv's 1.43M and shop 9.95M against Valibot's 12.26M.
Typia wasn't run there, since its generated validators
(`bench/generateTypia.ts`) weren't built first, so that run's rows and the
board's `startup.ts` rows lack it; at 90d510484 it was the closest library on
moltar, 1.16M to 1.05M, 19 of 20.

## Best average

The headline's superlatives come from one rule, which the homepage's board
and the site's [Benchmarks page](https://arktype.io/docs/precompile/benchmarks)
follow too: a library is the fastest, the quickest to start or the smallest
if it has the lowest average in that category across other projects' public
benchmarks. The average is a geometric mean, in the unit the benchmark
measures, over the largest set of results that ArkType, Zod and three more
libraries the site names all ran, and every library that ran all of those
results is ranked in plain order ("The rule"). ArkType is one build
throughout: precompiled with the default options. The size suites are rerun
every month at each library's newest release ("Monthly" under "Reproduce").

### Current standings: ArkType's counts at 20710020e, its sizes at ba691ac56

`node standings.ts`, on the published rows (`ark/docs/lib/bench/leaderboard.json`):
the size suites with each rival at its newest release as measured on
2026-11-06 and ArkType's bundles measured again at ba691ac56, the instruction
counts with rivals at their releases of 2026-10-24 and 2026-10-25.

| category | averaged                                                                   | ranked | 1             | 2             | 3              |
| -------- | -------------------------------------------------------------------------- | ------ | ------------- | ------------- | -------------- |
| speed    | 22 of 43 results: schemabenchmarks.dev 14, ata's validator-benchmarks 8    | 5      | ArkType 664   | Typia 2,863   | Valibot 5,675  |
| startup  | 2 of 2: schemabenchmarks.dev's initialization, Sury's build and parse once | 6      | ArkType 40    | TypeBox 4,273 | Valibot 15,028 |
| size     | 2 of 3: valibot.dev's login form, schemabenchmarks.dev's download          | 12     | ArkType 1,191 | Typia 1,520   | ajv 1,594      |

Speed and startup are CPU instructions, size gzipped bytes. ArkType's speed
mean is 76.8% lower than the next best's, its startup mean 99.1% lower and
its size mean 21.7% lower, figured as `claims.ts` states them (1 − ArkType's
/ the next best's).

Row by row it isn't first everywhere, and the Benchmarks page lists every
row. On speed it has the fewest instructions on 17 of the 22; on the other
five ata is ahead on four, ajv on two and Typia and @exodus/schemasafe on
one each. On startup it is 3rd of 23 on schemabenchmarks.dev's
initialization, 15.970 instructions to zod-compiler's 15.943 and paseri's
15.957, all at the harness's floor, and 1st of 6 on Sury's. Both startup rows
time creating a schema, which ArkType's default build does when it builds. On
size it has the smallest bundle on both rows, narrowly: 917 B on the form to
ajv's 935, and 1547 B on the download to @railway-ts/pipelines' 1568.

Speed's and size's leads hold with any one suite left out. Startup's doesn't
survive leaving out Sury's, which leaves the initialization row alone.

### The headline's suites

The headline and the homepage's board rank by the independent suites only,
every qualifying suite but the four we designed (the homepage's benchmark,
`startup.ts`, the homepage's cold start and the homepage's apps), so
ArkType's own benchmarks don't decide its claims. It applies to all three
categories alike. valibot.dev's login form counts, and it's partly ours: its
schema is Valibot's code from valibot.dev, but we wrote it in every other
library (`forms/`) and wrote the script that sizes it. The site says so
wherever it states these standings (`isWrittenByUs`). `independentSuites` in
`ark/docs/lib/bench/leaderboard.ts` decides which suites those are.

Our own four are published beside them, on the Benchmarks page, and decide
nothing. On them, at the same commit: the default build is 1st of 8 for
speed (123 ns a validation, geometric mean of the 27 scenarios every library
ran, to ajv's 187); it runs the fewest instructions on every app of
`startup.ts` against every library, and by the clock is 2nd of 8 to start,
3.90 ms to Valibot's 3.89; and it is 2nd of 8 for size on the homepage's
apps, 1.90 kB to ajv's 1.61.

Counting only the independent suites was decided on 2026-10-25, and the
average above (the largest shared set of rows, in units, in plain order) on
2026-11-18, each with standings known. The second replaced an earlier way of
averaging, whose standings and history are in this file before that date
(`git log -- ark/repo/bench/external/README.md`). What each choice does to
the result is under "Objections".

### Which libraries the site names

Every standing and average counts every library on the rows. The
homepage, its social card and the blog post's numbers name a library only if
its npm package had at least 100k downloads in the week before
(`wellKnownDownloads` in `ark/docs/lib/bench/leaderboard.ts`), so the
libraries named are ones a reader knows. Where the next best or the leader
isn't named, the copy says "the next best" or "the best" and names the best
library that is beside it. The docs build throws if the homepage or the blog
post names one under the cutoff.

`node downloads.ts` asks npm's public API
(`api.npmjs.org/downloads/point/last-week/<package>`) for each library on a
row and writes `results/downloads-<date>.json`, which `leaderboard.ts` copies
into `leaderboard.json`. The week of 2026-10-16 to 2026-10-22:

| library                                 | package                         | downloads   | named |
| --------------------------------------- | ------------------------------- | ----------- | ----- |
| ajv                                     | `ajv`                           | 249,308,485 | yes   |
| Zod, Zod Mini, Zod 3 and Zod (compiled) | `zod`                           | 221,643,257 | yes   |
| TypeBox                                 | `@sinclair/typebox` + `typebox` | 81,996,242  | yes   |
| Effect Schema                           | `effect`                        | 31,551,008  | yes   |
| Joi                                     | `joi`                           | 15,736,800  | yes   |
| Valibot                                 | `valibot`                       | 14,436,274  | yes   |
| Yup                                     | `yup`                           | 7,451,643   | yes   |
| @cfworker/json-schema                   | `@cfworker/json-schema`         | 6,709,707   | yes   |
| Superstruct                             | `superstruct`                   | 4,325,353   | yes   |
| @exodus/schemasafe                      | `@exodus/schemasafe`            | 2,815,227   | yes   |
| io-ts                                   | `io-ts`                         | 1,780,315   | yes   |
| ArkType                                 | `arktype`                       | 1,445,087   | yes   |
| @sapphire/shapeshift                    | `@sapphire/shapeshift`          | 1,000,634   | yes   |
| sury                                    | `sury`                          | 269,129     | yes   |
| Typia                                   | `typia`                         | 211,406     | yes   |
| runtypes                                | `runtypes`                      | 147,816     | yes   |
| pure-parse                              | `pure-parse`                    | 45,285      | no    |
| zod-compiler                            | `zod-compiler`                  | 40,310      | no    |
| @remix-run/data-schema                  | `@remix-run/data-schema`        | 32,295      | no    |
| decoders                                | `decoders`                      | 18,035      | no    |
| rescript-schema                         | `rescript-schema`               | 12,657      | no    |
| ts-auto-guard                           | `ts-auto-guard`                 | 10,319      | no    |
| ata                                     | `ata-validator`                 | 3,913       | no    |
| @sinclair/typemap/valibot               | `@sinclair/typemap`             | 1,971       | no    |
| spectypes                               | `spectypes`                     | 534         | no    |
| ts-runtime-checks                       | `ts-runtime-checks`             | 294         | no    |
| stnl                                    | `stnl`                          | 97          | no    |
| type-predicate-generator                | `type-predicate-generator`      | 87          | no    |
| @sx3/gate                               | `@sx3/gate`                     | 19          | no    |
| @railway-ts/pipelines                   | `@railway-ts/pipelines`         | 14          | no    |
| @ts-runtypes                            | `@ts-runtypes/core`             | 9           | no    |
| paseri                                  | none: it publishes to JSR only  | 0           | no    |

The cutoff sits in the widest gap near the least-downloaded validator
readers know: Typia has 211k, runtypes 148k and pure-parse, the
most-downloaded below them, 45k. Downloads count dependents too, so
@cfworker/json-schema, @exodus/schemasafe and @sapphire/shapeshift clear it
mostly as other packages' dependencies. None of them is named today.

### The rule

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
row. The homepage's size and cold-start
rows were bundled for development, so before averaging they are rebuilt and
remeasured with every library in production (`bench/bundle.ts`); its speed
rows run ArkType's validators as precompiled, which pruning doesn't change.
The login form is remeasured at the same commit.

**Libraries.** Every library in any suite. A library's variants in one suite
(a mode in parentheses after its name, as in moltar's TypeBox and ata
cases, or the form's TypeBox TypeCompiler and Value) count as that library,
by its best variant on each row; Zod, Zod Mini and z.compile stay three, as the homepage names
them.

**Which results.** Only the independent suites' rows are ranked ("The
headline's suites"). A category's standings average the largest set of those
rows that ArkType, Zod and three more libraries the site names all have a
result on, so every library is compared over the same work. Of two sets as
large, the one more libraries ran in full is taken, and then the libraries'
names in alphabetical order settle it. Which rows are averaged depends on who
ran what and never on a result.

**Average.** A library's standing is the geometric mean of its results on
those rows, in the unit the rows are measured in: CPU instructions for speed
and startup, gzipped bytes for size. The rows span orders of magnitude, and a
geometric mean weighs each the same.

**Places.** Every library with a result on all of those rows is ranked,
lowest mean first, whether the site names it or not. A library missing from
any of them isn't ranked, since its mean would be over other rows. Places are
plain order: two libraries share one only with equal means.

**Claiming.** The site states that ArkType is first in a category only where
its mean is the lowest and no other library's equals it. Startup needs one
more thing, since its independent rows time only creating a schema: on each
of `startup.ts`'s apps, the default build must run fewer instructions than
every library, by median and by a two-sided sign test over the rounds paired
by run (p < 0.05).

**Use.** `ark/repo/bench/external/leaderboard.ts` gathers every row into
`ark/docs/lib/bench/leaderboard.json`. `ark/docs/lib/bench/units.ts` is the
rule, with its tests beside it, and `ark/docs/lib/claims.ts` words the
headline, the board and their notes from it, so a rerun that changes a
standing changes the copy, and the docs build throws if the copy names a
category's superlative, or says "Pick 3", while ArkType can't claim it.
`node standings.ts` prints the standings, `pnpm benchBoard` prints them
beside our own benchmark's, and the
[Benchmarks page](https://arktype.io/docs/precompile/benchmarks) publishes
every row behind them. Nothing is rerun to change a result: the monthly rerun
runs on its schedule whatever the last one showed.

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

| suite                                          | run by                   | verdict                                                                                                                      |
| ---------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| moltar's typescript-runtime-type-benchmarks    | moltar                   | in (speed)                                                                                                                   |
| schemabenchmarks.dev (open-circle)             | Open Circle              | in: speed (26 rows), startup (initialization), size (download)                                                               |
| Sury's schema benchmark (`docs/benchmarks`)    | Sury's author            | in: speed (parse), startup (build and parse once), size (what a check of the schema ships); its whole-library row is out (3) |
| ata's validator-benchmarks                     | ata's author             | in (speed, 12 rows)                                                                                                          |
| the homepage, `startup.ts`, valibot.dev's form | us, and Valibot's author | in                                                                                                                           |
| Zod's published comparisons                    | Zod's author             | out as a suite: its cross-library numbers are moltar runs, its sizes Zod against Zod Mini (4)                                |
| typia's `benchmark/`                           | typia's author           | out: no Valibot (4)                                                                                                          |
| TypeBox's benchmarks                           | TypeBox's author         | out: ajv only (4)                                                                                                            |
| icebob/validator-benchmark and smaller repos   | various                  | out: unchanged since 2024 or before (2)                                                                                      |
| blog comparisons, bundlephobia, pkg-size       | various                  | out: no harness, or the whole package rather than a bundle using it (1, 3)                                                   |

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
  since the precompiler doesn't read esbuild's stdin. It also bundles each
  library's boolean check of the same schema, which must reject a value with
  a string for a number too: `S.isInput`, Zod's `safeParse().success`,
  Valibot's `v.is`, the code TypeBox's `TypeCompiler.Code` writes, and
  ArkType's `.allows` (`sury/check.ts`).
- ata's: `ata/validators.ts` writes its user and order bodies in ArkType,
  `ata/build.ts` precompiles them, and `ata/impls.patch` adds an adapter as
  typia's is added. `ata/arms.ts` and `count.ts` count instructions per
  document; a child exits where an adapter disagrees with a scene.

Two startup rows time no build for a library that compiles ahead of time:
schemabenchmarks.dev's initialization and Sury's build-and-parse-once.
ArkType's default build creates a validator once and reuses it (16 and 102
instructions, at the harness's floor beside zod-compiler's 16 and TypeBox's
ahead-of-time 153; typia's createIs 381; "Versions and modes" below), so on
those rows it wins by what the rows don't measure. They're the suites' rows,
so they stay.

### Versions and modes

Each suite pins its own installs, and some pins trail what a reader would
install today: moltar's typia 9.7.2 and ata-validator 1.32.1, ata's suite's
own ata-validator 1.48.0, Sury's zod 4.4.3 and valibot 1.4.2. So each suite's
rivals are counted twice, at its pins and at the latest npm releases of
2026-10-24 (`--latest`, `results/*-latest-2026-10-24.json`), and each arm
keeps its faster count. Rivals can only gain from this. The monthly rerun of
the size suites adds a third install, each rival at its newest release
(`results/newest/`). Newer isn't always faster: ata 1.60.0 takes 195
instructions on moltar's assertLoose to 1.32.1's 94, so moltar's ata rows
keep 1.32.1.

| suite                | at their latest releases                                                                                                        | left at the suite's pin                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| moltar's             | typia 15.2.1, ata-validator 1.60.0, @ts-runtypes 0.12.2, @sx3/gate 1.0.10, pure-parse 1.0.3, zod 4.6.7, valibot 1.5.0           | stnl 1.1.6 and sury 11.0.0-rc.2, whose latest releases break moltar's cases for them                |
| schemabenchmarks.dev | its 1c842272, with ata-validator 1.60.0 and typia 15.2.1                                                                        | none: the rest are current                                                                          |
| Sury's               | zod 4.6.7, valibot 1.5.0                                                                                                        | @sinclair/typebox 0.34.52, that package's latest (TypeBox 1 is a new package the suite doesn't use) |
| ata's                | ata-validator 1.60.0, typia 15.2.1, zod 4.6.7                                                                                   | @sinclair/typebox 0.34.52, as in Sury's                                                             |
| ours                 | every library at its latest but typia 15.1.0, whose 15.2.1 writes the same validators byte for byte, and TypeBox 1.3.37 (1.4.3) | not counted again: TypeBox is last but one on the homepage's speed suite                            |

Each library is measured on its suite's own operation (what the suite calls
for that library: a parse, an assert, a check) in its fastest or smallest
documented mode. A mode counts when it does that operation, and changing one
library's operation doesn't: only a change to the suite's, for every
library. So each rival runs in its fastest documented mode wherever the
suite allows it: typia's compiled `createIs`, `createValidate` and `createAssert`,
TypeBox's compiler, ajv's compiled validators (its standalone code where a
suite measures size), ata's ahead-of-time modules, paseri's, Sury's compiled
parsers and Zod's `z.compile`, counted as Zod (compiled). Where a suite had
no arm for a mode, it's added as ArkType's arm is: `z.compile` in Sury's and
ata's suites, Valibot's `v.is` for ata's verdicts, and ata's modules for
schemabenchmarks.dev's string formats (`sb/ataCompiled.ts`, `sb/ata.patch`).
ata won't write that suite's product schema as a module: its Date check is a
`withKeywords()` wrapper JSON Schema can't express. ata's config body needs a
5 s warmup to count reproducibly (`COUNT_WARM_US`); after 1 s, one arm's
reps spread up to 2.3x.

schemabenchmarks.dev's download sized ajv as its runtime, compiling the
product schema where it runs (41477 B gzipped), against ArkType's
precompiled build. `sb/ajvStandalone.ts` adds ajv's standalone code for the
same schema and options, run through the suite's own download script
(Rolldown, minified, gzipped) with the runtime helpers it imports: 20300 B,
2718 B gzipped. ajv keeps the smaller. The other download rows are byte for
byte the committed run's.

Sury's size row measures a boolean check, for every library. The suite
bundles a different operation per library (Sury's `parseOrThrow`, Zod's and
Valibot's parse, ArkType's `.assert`, TypeBox's `Check`), so its row
compared a throwing parse against TypeBox's check. Each library is now
sized on its documented boolean check of the same schema, the operation the
suite gives TypeBox, alongside the suite's own snippet, and keeps the
smaller: Sury's `S.isInput` (11616 B, its parse 11599), Zod's
`safeParse().success` (64689, its parse 64686), Valibot's `v.is` (1198, its
parse 1261), TypeBox's ahead-of-time Check, the code `TypeCompiler.Code`
writes, with no imports (213, its compiler 22568), and ArkType's `.allows`
(289, its `.assert` 1107). The change is to the suite's operation, for every
library, so it counts under the rule above. TypeBox leads the row and ArkType
is second. The rivals' bundles of the suite's own snippets are byte for byte
the earlier runs'. ArkType's check was measured at 396778442, beside
808927feb's `.assert`; both are now 2c1a6a86e's, the check 270 B and
`.assert` 1014 B. The other size suites' TypeBox
operations report errors, which the ahead-of-time Check doesn't. In TypeBox
1, `typebox/compile`'s `Code` is the same Check.

The same gap was in the two independent startup rows. schemabenchmarks.dev
times initialization only for libraries that build a schema at runtime: its
own precompiled entries, zod-compiler and @paseri/compiler, have no such
case. `sb/aotInit.ts` gives ajv's standalone code, zod-compiler and
@paseri/compiler one that returns the schema their module made as it loaded,
and ArkType's precompiled arm reads its schema the same way
(`sb/precompiled/benchmarks.ts`, 11067f517), where it had called a getter.
Sury's build and parse once runs TypeBox's ahead-of-time Check beside its
`Value.Check`. In instructions per call, one run of every ahead-of-time arm
(`results/sb-counts-init-11067f517.json`, Node 26.12.1, 3 reps):
zod-compiler 15.943, ArkType 15.954, @paseri/compiler 15.957, ajv 19.971,
typia's createIs 381.2, the first three at the harness's floor, each arm's
reps spreading 0.4-0.7%. On Sury's build, ArkType 101.9
(`results/arktype-init-11067f517.json`, the build at 91d3e2e20) and TypeBox
153.0 (`results/sury-counts-aot-2026-10-25.json`).

### Objections

**"Half of these benchmarks are yours."** We designed 1 of the 5 speed suites,
2 of the 4 startup suites and 1 of the 4 size suites, and the headline counts
none of them ("The headline's suites"). It does count valibot.dev's login
form, a size suite: its schema is Valibot's, but we wrote it in every other
library and wrote the script that sizes it. Without it, the size standings
are over schemabenchmarks.dev's download and Sury's check, and ArkType is
still first. Our own suites agree on speed and on startup in instructions,
and don't on size: on the homepage's apps the default build is 2nd, behind
ajv. Startup without ours is two rows that time creating a
schema, which a precompiled build doesn't do, so they show little; ours time
whole apps from import to first validation, and the headline's startup claim
needs those too ("Claiming").

**"Instruction counts aren't time."** They aren't. They're the measure
because these runs share a machine (1-minute loads of 9 to 20), and wall
clock there measures the neighbors. A count misses cache misses and branch
mispredictions, so it favors code that does less work badly. Where both
were measured, they mostly rank alike: by wall clock, in paired runs, the default
build beat each of the six libraries closest to it on moltar's parseSafe in
28 or 29 of 30 passes (p 8.7e-7) and ts-runtime-checks on assertLoose in 24
of 30 (p 0.0014), as their counts order them ("The release's wall-clock
run"). Not always: in the same plan's run at the release candidate,
the default build took the fewest instructions on parseSafe, but
rescript-schema and @sx3/gate were faster by wall clock in 21 and 24 of 30
passes, so H1 failed there ("The release candidate's run"). The homepage's
suite is wall clock: median ns over 20 passes and a
10-pass replica.

**"The rule is cherry-picked."** Which suites qualify was written at
2026-10-23T22:12Z, before any search for suites ("Which suites"). The rest
wasn't: counting only the independent suites, and averaging the largest set
of rows five libraries share, were both chosen with standings known. So
here is what the choices do. The set of rows is fixed by who ran what: for
speed, no library ran all 43 rows, and the 22 are the most that ArkType, Zod
and three named libraries share. Averaging every size row instead, all three,
ranks four libraries and ArkType is first of them, 726 B to Valibot's 1568.
Averaging the one startup row most libraries ran, schemabenchmarks.dev's
initialization, has ArkType 3rd of 23 by 0.03 instructions, which is why
startup's lead is stated as depending on Sury's. Speed holds with any one
suite left out.

**"Size isn't close."** By its mean it isn't: 1,191 B to Typia's 1,520,
21.7% lower, over two rows. Row by row it is. The default build has the
smallest bundle on each, by 18 bytes on the form (917 to ajv's standalone 935) and 21 on schemabenchmarks.dev's download (1547 to
@railway-ts/pipelines' 1568), and at 20710020e, before the default build
was shrunk, it was 2nd on both with a mean of 1,348 B. The lead holds with
any one suite left out. On our own apps, which the headline doesn't count,
the default build is 2nd: ajv's standalone code is the smallest on login and
moltar, and Valibot ships less than the default build on shop and saas, 2 of
the 7 size rows. Each month's rerun measures the size rows again with ArkType
at the branch's head, and the headline follows what it finds.

**"Precompiled against runtime is apples to oranges."** Every library that
documents a compiled mode is measured in it, where the suite's schema
compiles ("Versions and modes"): typia, ata, TypeBox, ajv, Sury, paseri,
@ts-runtypes and `z.compile`, and TypeBox's ahead-of-time Check in Sury's
bundle and build, and ajv's standalone code, zod-compiler and
@paseri/compiler in schemabenchmarks.dev's initialization. Valibot, Zod Mini and the rest run as
they ship, since they have no other mode. Plain `type()`, ArkType with no
build step, is left out of every row, and so is every build but the
default. The build step is a cost these numbers don't show: ArkType's
default build needs its bundler plugin.

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
