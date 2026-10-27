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
pnpm benchImport # the homepage's cold start
```

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

The published rows were counted on an Intel i7-11700 (8 cores, 16 threads)
under WSL2 (Linux 6.18, perf 6.18), pinned to cores 10-15, on Node 24.14.1
for moltar's, Sury's and ata's suites and `startup.ts`, 26.12.1 for
schemabenchmarks.dev (its `.node-version`) and 25.2.1 for the homepage's
benchmark.

**Weekly.** `.github/workflows/leaderboard.yml` runs
`pnpm benchExternal size --newest` every Monday on a GitHub-hosted runner:
ArkType at main, each rival at its newest release. `--newest` keeps the run
in `results/newest/`, with each suite's commit, date and installed versions
in `run.json`, and rewrites `ark/docs/lib/bench/leaderboard.json`, where
each rival keeps its smaller bundle of its pinned, 2026-10-24 and newest
installs, ArkType's rows are the run's and `measured` is the run's date,
which the site prints as "Standings as of". The job pushes nothing: it
checks the site's claims against the new standings
(`ark/docs/lib/bench/headline.ts`), shows the standings in its summary and
uploads the run as the `leaderboard` artifact. If a claim isn't backed, such
as a lead lost by more than the tie band, it opens an issue mentioning
@ssalbdivad, or updates the open one, with the claims before and after, the
standings and the run's link, and the run fails. Publishing new standings is
a rerun by hand and a commit. The speed and startup suites count
instructions with perf, and hosted runners don't expose hardware counters,
so they're rerun by hand on a machine that does, with `--newest` keeping
them the same way.

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
(B2) is 1037 B. The docs' size chart and `loginSize` cite this file, with B1 as
ArkType's bar. Its earlier 1313 was B2 at 89510709d, before builds pruned by
usage, as B1's 1779 was. The 1158 in "Best average" is the default build of
`forms/arktype.ts`, the same form with the same esbuild settings, which
exports a function that asserts where `login/arktype.ts` asserts once.

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

The headline's superlatives come from a rule, written before any average was
computed: a library is the fastest, the quickest to start or the smallest if
it has the best average in that category across the public benchmarks that
qualify. Since 2026-10-25 the headline counts only the independent ones:
other projects' suites, and valibot.dev's login form, whose code is Valibot's
though we wrote it in each library and size it with our script ("The
headline's suites"). The full board, every suite, is published beside it. In every category, an average within 5% of
the best counts as first ("Ties"), since one release can move a result by about that much. The size suites are rerun every week at each library's newest release
("Weekly" under "Reproduce"). The current standings come first, then the
rule, then each earlier average as its record.

### Current standings: ArkType at 781130da3, rivals at their releases of 2026-10-24 and 2026-10-27

Thirteen suites qualify: 5 for speed (75 rows), 4 for startup (9) and 4 for
size (7). `ark/docs/lib/bench/leaderboard.json` holds every row, and
`ark/docs/lib/claims.ts` computes the standings from it. The size rows
measure production Vite, Rollup, Rolldown or esbuild builds, which prune
validators by usage; webpack, Rspack and Turbopack don't
([`prune`](https://arktype.io/docs/precompile/options#prune)), so their
bundles are larger.

| category | suite                                       | rows | measure                          | run by                   |
| -------- | ------------------------------------------- | ---- | -------------------------------- | ------------------------ |
| speed    | moltar's typescript-runtime-type-benchmarks | 4    | instructions per call            | moltar                   |
| speed    | the homepage's benchmark                    | 32   | median ns per call               | us                       |
| speed    | schemabenchmarks.dev                        | 26   | instructions per call            | Open Circle              |
| speed    | Sury's schema benchmark                     | 1    | instructions per call            | Sury's author            |
| speed    | ata's validator-benchmarks                  | 12   | instructions per document        | ata's author             |
| startup  | `startup.ts`                                | 4    | instructions beyond the baseline | us                       |
| startup  | the homepage's cold start                   | 3    | median ms                        | us                       |
| startup  | schemabenchmarks.dev's initialization       | 1    | instructions per call            | Open Circle              |
| startup  | Sury's build and parse once                 | 1    | instructions per call            | Sury's author            |
| size     | valibot.dev's login form                    | 1    | gzipped bytes                    | us, and Valibot's author |
| size     | the homepage's apps                         | 4    | gzipped bytes                    | us                       |
| size     | schemabenchmarks.dev's download             | 1    | gzipped bytes                    | Open Circle              |
| size     | Sury's schema bundled as a check            | 1    | gzipped bytes                    | Sury's author            |

ArkType's instruction-count and size rows are measured at 781130da3, by
claim-all's finalrun steps: `results/arktype-781130da3.json` and
`results/startup-781130da3-node24.json`. The form, schemabenchmarks.dev's
download and Sury's check score `results/newest/` instead, sized again at
2c1a6a86e, whose runtime is 781130da3's, with every rival at its newest
release of 2026-10-27. The homepage's wall-clock rows in `benchData.json`
weren't rerun: its scenarios stay 808927feb's.

Each rival arm is the faster of two counts, at its suite's pins and at the
latest releases ("Versions" below).

The headline's standings, over the 9 independent suites: 4 for speed (43
rows), 2 for startup (2) and 3 for size (3).

| category | 1                    | 2              | 3              |
| -------- | -------------------- | -------------- | -------------- |
| speed    | ArkType 1.083        | ata 1.254\*    | paseri 2.140\* |
| startup  | zod-compiler 1.000\* | paseri 1.001\* | ArkType 1.002  |
| size     | ArkType 1.176        | Typia 1.256\*  | ajv 1.317\*    |

\* ranked on half to three quarters of the category's suites. ArkType's
speed average is 13.7% lower than the next best's and its size average 6.3%
lower, figured as `claims.ts` states them (1 − ArkType's / the next best's).
Startup's three are within 0.2%, on schemabenchmarks.dev's
initialization alone for zod-compiler and paseri, so ArkType counts as first,
within the 5% that does. Both startup rows time creating a schema, which
ArkType's default build does when it builds, so they show little. Speed and
startup hold with any one suite left out; the size lead doesn't ("Size isn't
close" below).

The full board, every suite:

| category | 1             | 2             | 3                   |
| -------- | ------------- | ------------- | ------------------- |
| speed    | ArkType 1.120 | ata 1.254\*   | ajv 2.910\*         |
| startup  | ArkType 1.014 | ajv 1.476\*   | Typia 5.299\*       |
| size     | ajv 1.326\*   | ArkType 1.332 | Superstruct 1.464\* |

\* ranked on 2 to 4 of the category's suites. The homepage's speed suite is
ArkType 1.282, ajv 1.963. ArkType's size: the login form 1002 B (1.072), the
homepage's apps 1.933, schemabenchmarks.dev's download 1879 B (1.198),
Sury's check 270 B (1.268, TypeBox's 213). ajv's: the form 1.000, the
homepage's apps 1.346, schemabenchmarks.dev's download 2718 B (1.733), and
it isn't in Sury's. ArkType's speed average is 10.7% lower than the next
best's and its startup average 31.3% lower; ajv's size average is 0.4% lower
than ArkType's, within the 5% that counts as first.

### The headline's suites

The headline and the homepage's board rank by the independent suites only,
every qualifying suite but the four we designed (the homepage's benchmark,
`startup.ts`, the homepage's cold start and the homepage's apps), so
ArkType's own benchmarks don't decide its claims. It applies to all three
categories alike. valibot.dev's login form counts, and it's partly ours: its
schema is Valibot's code from valibot.dev, but we wrote it in every other
library (`forms/`) and wrote the script that sizes it. The site says so
wherever it states these standings (`isWrittenByUs`). Size's lead doesn't
survive leaving it out. `independentSuites` in
`ark/docs/lib/bench/leaderboard.ts` is the rule, and `claims.ts` computes
the headline, the board and their notes from it, so a rerun that changes a
standing changes the copy. The build throws if the copy names a category's
superlative, or says "Pick 3", while ArkType can't claim it: it needs the
best average, or one within 5% of it.

The rule was chosen on 2026-10-25, after the standings above were known, as
the subset a reader can check fastest: no suite in it is ours. Every other
uniform subset we computed (suites by library count, suites that measure all
three categories, rows without boolean checks, libraries measured on every
suite) left size with ajv or Typia too, and some only by unranking the
runners-up. Wherever the headline's standings are stated, the site states
ArkType's place on the full board beside them.

### Which libraries the site names

Every standing, average and tie counts every library on the rows. The
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

**Ties.** In every category, a score within 5% of the best counts as first,
so ArkType may claim a category with a score up to 1.05 times the best, and
any other library within it counts as first beside it. Where ArkType is first
by the band rather than the best score, the site names the library with the
best average and says ArkType is within 5% of it; where ArkType has the best
score, it says by how much. One release can move a result by about that
much: Valibot 1.5.0's bundle in Sury's suite is 3.3% smaller than 1.4.2's,
and moving from Node 24 to 25 changed `startup.ts`'s counts by 0 to 6% per
library (`results/startup-4fd880692-node24.json` and `-node25.json`). `tieBand` in
`ark/docs/lib/bench/leaderboard.ts` is the band. It was set for size on
2026-10-25, with the standings above known, making Typia's 3.3% lead on size
one ArkType could claim, and applied to speed and startup alike the same day.

**Coverage.** A library's suite score counts only if it's measured on at
least half that suite's rows. It's ranked in a category only if it has a
counted score in at least half of the category's suites.

**Use.** `ark/repo/bench/external/leaderboard.ts` gathers every row into
`ark/docs/lib/bench/leaderboard.json`; `ark/docs/lib/claims.ts` computes the
scores from it and throws if the headline claims a category ArkType can't
claim. Nothing is rerun to change a result: the weekly rerun runs on its
schedule whatever the last one showed.

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
keeps its faster count. Rivals can only gain from this. The weekly rerun of
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
2718 B gzipped. ajv keeps the smaller, which moved size from ArkType 1.355
against Valibot's 1.394 to ajv 1.326 against ArkType's 1.355. The other
download rows are byte for byte the committed run's.

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
library, so it counts under the rule above. TypeBox leads the row; ArkType
was second at 1.357. The rivals' bundles of the suite's own snippets are
byte for byte the earlier runs'. ArkType's check was measured at 396778442,
beside 808927feb's `.assert`; both are now 2c1a6a86e's, the check 270 B
(1.268) and `.assert` 1014 B. The other size suites' TypeBox
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
153.0 (`results/sury-counts-aot-2026-10-25.json`). Over the independent
suites, startup is then zod-compiler 1.000 (one suite), ArkType 1.000 and
@paseri/compiler 1.001 (one suite): ArkType counts as first within 5% of
zod-compiler. On the full board ArkType led, 1.013 to ajv's 1.449.

With ArkType's rows unchanged, the update moved speed from ArkType 1.103
against ata 1.255 to 1.107 against 1.255, left startup alone, and moved size
from 1.355 against Valibot's 1.405 to 1.355 against 1.394: Valibot 1.5.0's
bundle in Sury's suite is 1261 B gzipped, 1.4.2's 1304.

### Objections

**"Half of these benchmarks are yours."** We designed 1 of the 5 speed suites,
2 of the 4 startup suites and 1 of the 4 size suites, and the headline counts
none of them ("The headline's suites"). It does count valibot.dev's login
form, a size suite: its schema is Valibot's, but we wrote it in every other
library and wrote the script that sizes it. Without it, size goes to
@railway-ts/pipelines (one suite), then Typia 1.177, @remix-run/data-schema
1.226 and ArkType 1.232. On the full board, with ours, speed is ArkType
1.120 against ata 1.254 (the homepage's suite is ArkType's worst, 1.282),
startup ArkType 1.014 against ajv 1.476, and size ajv 1.326 against
ArkType's 1.332. Startup without ours is two rows that time creating
a schema, which a precompiled build doesn't do, so they show little; with
ours, which time whole apps from import to first validation, ArkType is
still first. ata, the closest at speed, isn't in the homepage's suite or
Sury's; its average is over the three suites it's in.

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

**"Best average is cherry-picked."** The rule (which suites count, a ratio
to each row's best, a geometric mean per suite, each suite weighted the
same) was written at 2026-10-23T22:12Z, before any search for suites. Its
first averages had ArkType losing speed and size, and they stay below as
records. Speed and startup hold with any one suite left out. Speed's
closest is without schemabenchmarks.dev: ArkType 1.074, 6.7% lower than
ata's 1.151.

**"Size isn't close."** Over the independent suites ArkType leads it,
1.176, 6.3% lower than Typia's 1.256 on the two of three Typia is in, but the lead
doesn't survive leaving out any one suite: without the form, Typia 1.177
and @remix-run/data-schema 1.226 come before ArkType's 1.232; without
schemabenchmarks.dev's download, ajv 1.000 (one suite) before ArkType's
1.166; without Sury's, @railway-ts/pipelines 1.000 (one suite) before
ArkType's 1.133. At 624a5d716's size rows ArkType led, 1.240 to 1.256,
and at 808927feb's Typia led, 1.256 to 1.297. On the full board ajv leads
it, 1.326, 0.4% lower than ArkType's 1.332, so both count as first. ajv's lead survives leaving out schemabenchmarks.dev's download (ajv
1.160 in two of three suites, ArkType 1.380) or Sury's (ajv 1.326, ArkType
1.354), not the form (ArkType 1.432, ajv 1.527) or the homepage's apps
(ArkType 1.176, Typia 1.256). Valibot ships less than the default build on
2 of the 7 size rows, the homepage's shop and saas, and ajv's standalone
code has the best score on the form and on the homepage's apps.

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

### History

Each average below was computed at the commit it names, before the current
standings, and stands as its record. Nothing in it was rerun to change a
result.

#### ArkType's rows at 808927feb, rivals at their latest releases

The current standings' suites, before ArkType's rows were measured again at
781130da3 and its size rows at 2c1a6a86e.

ArkType's rows were measured at 808927feb, after the first issue began to be
pushed directly (a size trade) and object issues began to be reported in
declaration order: `benchData.json`'s scenarios rerun, 20 passes then a
10-pass replica, every library in, at 1-minute loads of 2.3 to 4.9 at the
runs' starts and ends (each started under 4); every other ArkType row in
`results/arktype-808927feb.json` and `results/startup-808927feb-node24.json`.

Each rival arm is the faster of two counts, at its suite's pins and at the
latest releases ("Versions and modes" above).

The headline's standings, over the 9 independent suites: 4 for speed (43
rows), 2 for startup (2) and 3 for size (3).

| category | 1             | 2             | 3                             |
| -------- | ------------- | ------------- | ----------------------------- |
| speed    | ArkType 1.067 | ata 1.255\*   | paseri 2.142\*                |
| startup  | ArkType 1.000 | Typia 8.962\* | @railway-ts/pipelines 186.8\* |
| size     | Typia 1.256\* | ArkType 1.297 | ajv 1.317\*                   |

\* ranked on half to three quarters of the category's suites. Leads: speed
17.6%, startup 796%; Typia leads size by 3.3%, on the form and
schemabenchmarks.dev's download (it isn't in Sury's), within the 5% that
counts as first. Both startup rows time creating a schema, which ArkType's
default build does when it builds, so they show little. Speed and startup hold with any one suite left out.

The size rows were then rerun (`results/newest/`, "Weekly" under
"Reproduce"): ArkType at 624a5d716, its form 1107 B, schemabenchmarks.dev's
download 1934 B and Sury's check 278 B, every rival at its newest release of
2026-10-25. The headline's size standings were then ArkType 1.240, Typia
1.256\*, ajv 1.317\*, and the full board's ajv 1.326\*, ArkType 1.414,
Superstruct 1.464\*. The run before it, at 2cc2aa949 (form 1116 B, download
1977 B, the same rivals), had ArkType 1.252. The tables are the record at 808927feb.

The full board, every suite:

| category | 1             | 2             | 3                   |
| -------- | ------------- | ------------- | ------------------- |
| speed    | ArkType 1.107 | ata 1.255\*   | ajv 2.912\*         |
| startup  | ArkType 1.013 | Typia 2.815\* | Valibot 18.0        |
| size     | ajv 1.326\*   | ArkType 1.462 | Superstruct 1.464\* |

\* ranked on 2 to 4 of the category's suites. The homepage's speed suite is
ArkType 1.282, ajv 1.963. ArkType's size: the login form 1158 B, the
homepage's apps 2.095, schemabenchmarks.dev's download 2037 B (1.299),
Sury's check 289 B (1.357, TypeBox's 213). ajv's: the form 1.000, the
homepage's apps 1.346, schemabenchmarks.dev's download 2718 B (1.733), and
it isn't in Sury's. Leads: speed 13.4%, startup 178%; ajv leads size by
10.3%.

At 808927feb's rows ajv's size lead survived leaving out
schemabenchmarks.dev (ajv 1.160, in two of three suites), Sury's (ajv 1.326,
with ArkType fourth at 1.499) or the form (ajv 1.527 to ArkType's 1.546),
not the homepage's apps (Typia 1.256 in two of three, ArkType 1.297).
Valibot shipped less than the default build on 3 of the 7 size rows.
Without the form, size went to @railway-ts/pipelines (one suite), then
Typia 1.177, then ArkType 1.283. Speed's closest without one suite was
without schemabenchmarks.dev: ArkType 1.110, ata 1.151, a 3.7% lead.

#### Sury's size row as the suite's operations

The standings before Sury's size row compared each library's boolean check,
when it bundled the suite's own snippets (ArkType's `.assert`, 1107 B, best
on the row) and TypeBox's compiler. Everything else is the standings'
above, at 808927feb.

| category | 1             | 2             | 3             |
| -------- | ------------- | ------------- | ------------- |
| speed    | ArkType 1.107 | ata 1.255\*   | ajv 2.912\*   |
| startup  | ArkType 1.013 | Typia 2.815\* | Valibot 18.0  |
| size     | ajv 1.326\*   | ArkType 1.355 | Valibot 1.394 |

\* ranked on 2 to 4 of the category's suites. Leads: speed 13.4%, startup
178%; ajv leads size by 2.2%.

#### ajv's runtime in schemabenchmarks.dev's download

The standings before ajv's standalone code was sized there. Everything else
is the standings' above, at 808927feb.

| category | 1             | 2             | 3                   |
| -------- | ------------- | ------------- | ------------------- |
| speed    | ArkType 1.107 | ata 1.255\*   | ajv 2.912\*         |
| startup  | ArkType 1.013 | Typia 2.815\* | Valibot 18.0        |
| size     | ArkType 1.355 | Valibot 1.394 | Superstruct 1.464\* |

\* ranked on 2 to 4 of the category's suites. Leads: speed 13.4%, startup
178%, size 2.9%.

#### ArkType's rows at 808927feb, rivals at the suites' pins

The standings before rivals were counted at their latest releases. The
suites, rows and ArkType's rows are those above, at 808927feb.

| category | 1             | 2             | 3                   |
| -------- | ------------- | ------------- | ------------------- |
| speed    | ArkType 1.103 | ata 1.255\*   | ajv 2.873\*         |
| startup  | ArkType 1.013 | Typia 2.815\* | Valibot 29.4        |
| size     | ArkType 1.355 | Valibot 1.405 | Superstruct 1.464\* |

\* ranked on 2 to 4 of the category's suites. Leads: speed 13.8%, startup
178%, size 3.7%.

#### The first average, at 642b4517e

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

#### Every qualifying suite, at 6c5fd9862

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

#### ArkType's rows at 90d510484

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

#### ArkType's rows at fea8e68e0, the homepage's speed in ns

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
