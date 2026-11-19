// rebuilds the leaderboard's rows from a clean checkout, a suite at a time or
// all of them. Each external suite is cloned at the commit its rows were
// counted on into out/clones/<suite>, reset and installed from its own
// lockfile (with --latest, at the releases results/*-latest-2026-10-24.json
// count instead), given ArkType as the README's "How each new suite is run"
// says, and counted into out/fresh/. The form and startup.ts rerun as their
// own scripts do. leaderboard.ts then writes out/fresh/leaderboard.json, every
// fresh file in place of its committed one, and standings.ts prints it.
// With --newest, each rival is at its newest release instead, the form's
// included, and the run is kept in results/newest/, where leaderboard.ts reads
// it beside the committed results to rewrite the published leaderboard. A
// rival with a build step moves with the packages it builds on (newest.ts),
// and where a suite can't build its newest release it's measured at the last
// one the suite built, which run.json records as held.
// `size` runs only what measures bundles: the form and the download and
// bundle rows of schemabenchmarks.dev and Sury, which need no perf.
// After `pnpm build`, with git, perf and taskset; NODE24 and NODE26 name Node
// 24.14.1 and 26.12.1 (default: this node)
// pnpm benchExternal <moltar|sb|sury|ata|form|startup|size|all> [--latest|--newest]
import { spawnSync, type SpawnSyncOptions } from "node:child_process"
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { dirname, join } from "node:path"
import {
	holdsFor,
	ownerOf,
	packageOf,
	specsFor,
	highestOf,
	toolchains,
	type Held
} from "./newest.ts"

const here = import.meta.dirname
const repo = join(here, "..", "..", "..", "..")
const clones = join(here, "out", "clones")
const fresh = join(here, "out", "fresh")
const node24 = process.env.NODE24 ?? process.execPath
const node26 = process.env.NODE26 ?? process.execPath
const [target = "all", flag] = process.argv.slice(2)
const newest = flag === "--newest"
const latest = flag === "--latest" || newest
const suffix =
	newest ? "-newest"
	: latest ? "-latest"
	: ""
const sizeOnly = target === "size"

// the latest releases on 2026-10-24 of each suite's rivals, where the suite's
// code runs on them (README, "Versions")
const releases = {
	moltar: [
		"@sx3/gate@1.0.10",
		"@ts-runtypes/core@0.12.2",
		"@ts-runtypes/bin@0.12.2",
		"@ts-runtypes/devtools@0.12.2",
		"ata-validator@1.60.0",
		"pure-parse@1.0.3",
		"typia@15.2.1",
		"valibot@1.5.0",
		"zod@4.6.7"
	],
	// ttsc and its unplugin are the suite's catalog pins, which typia builds on
	sb: [
		"ata-validator@1.60.0",
		"typia@15.2.1",
		"ttsc@0.34.1",
		"@ttsc/unplugin@0.34.1"
	],
	sury: ["zod@4.6.7", "valibot@1.5.0"],
	ata: ["ata-validator@1.60.0", "typia@15.2.1", "zod@4.6.7", "ttsc@0.34.1"],
	// forms/package.json's, zod and typia from ark/repo's, and the ttsc that
	// compiles typia's form
	form: [
		...Object.keys(
			JSON.parse(readFileSync(join(here, "forms/package.json"), "utf8"))
				.dependencies
		),
		"zod",
		"typia",
		"ttsc"
	]
}

type Suite = keyof typeof releases

type RunRecord = {
	commit: string
	date: string
	installed: Record<string, string>
	held?: Record<string, Held>
}

// where each suite this run updated installed its rivals
const installs: Partial<Record<Suite, string>> = {}

// the rivals each suite couldn't build at their newest releases
const held: Partial<Record<Suite, Record<string, Held>>> = {}

const runPath = join(here, "results", "newest", "run.json")

// what each suite's last --newest run installed, which built
const lastRuns: Partial<Record<Suite, RunRecord>> =
	existsSync(runPath) ? JSON.parse(readFileSync(runPath, "utf8")) : {}

// what npm's registry says of a package: undefined where it has no such field
const npmView = (spec: string, field: string) => {
	const { status, stdout } = spawnSync("npm", ["view", spec, field, "--json"], {
		encoding: "utf8"
	})
	if (status !== 0)
		throw new Error(`npm view ${spec} ${field} exited ${status}`)
	return stdout.trim() ? JSON.parse(stdout) : undefined
}

// the version of each toolchain package a suite installs beside a rival's
// newest release: the highest the release's peer or dev requirement allows,
// and for one it doesn't name, the version of the one it does, as ttsc's
// unplugin is published with ttsc
const toolsOf = (suite: Suite) => {
	const tools: Record<string, string> = {}
	for (const name of releases[suite].map(packageOf)) {
		const rival = ownerOf(name, releases[suite])
		if (!rival || held[suite]?.[rival]) continue
		const range =
			npmView(`${rival}@latest`, "peerDependencies")?.[name] ??
			npmView(`${rival}@latest`, "devDependencies")?.[name]
		const named = toolchains[rival].map(tool => tools[tool]).find(Boolean)
		tools[name] =
			range ? highestOf(npmView(`${name}@${range}`, "version"))
			: named && npmView(`${name}@${named}`, "version") ? named
			: highestOf(npmView(name, "versions"))
	}
	return tools
}

// a suite's rivals to install into dir: with --newest, each at its newest
// release, or the release it's held at
const releasesOf = (suite: Suite, dir: string) => {
	installs[suite] = dir
	return newest ?
			specsFor({
				releases: releases[suite],
				tools: toolsOf(suite),
				held: held[suite] ?? {},
				last: lastRuns[suite]?.installed ?? {}
			})
		:	[...releases[suite]]
}

// the version of each rival a suite installed
const installedIn = (suite: Suite, dir: string) =>
	Object.fromEntries(
		releases[suite].map(release => {
			const name = packageOf(release)
			const manifest = join(dir, "node_modules", name, "package.json")
			return [name, JSON.parse(readFileSync(manifest, "utf8")).version]
		})
	)

const run = (
	node: string,
	command: string,
	args: string[],
	opts: SpawnSyncOptions = {}
) => {
	console.log(`$ ${command} ${args.join(" ")}`)
	const { status } = spawnSync(command, args, {
		stdio: "inherit",
		...opts,
		env: {
			...process.env,
			...opts.env,
			PATH: `${dirname(node)}:${process.env.PATH}`
		}
	})
	if (status !== 0) throw new Error(`${command} exited ${status}`)
}

// the suite's clone at commit, with nothing but its own files
const checkout = (name: string, url: string, commit: string) => {
	const dir = join(clones, name)
	if (!existsSync(dir)) {
		mkdirSync(clones, { recursive: true })
		run(node24, "git", ["clone", "--filter=blob:none", url, dir])
	}
	run(node24, "git", ["checkout", "-f", commit], { cwd: dir })
	run(node24, "git", ["clean", "-fdx", "-e", "node_modules"], { cwd: dir })
	return dir
}

const count = (
	arms: string,
	out: string,
	reps: number,
	env: Record<string, string> = {}
) =>
	run(
		node24,
		process.execPath,
		[join(here, "count.ts"), join(fresh, out), String(reps)],
		{ cwd: here, env: { ...env, COUNT_ARMS: arms } }
	)

// writes the arms of armsFile whose labels pass keep to a file of their own
const armsOf = (
	armsFile: string,
	name: string,
	keep: (label: string) => boolean
) => {
	const { count } = JSON.parse(
		readFileSync(join(here, "out", armsFile), "utf8")
	)
	const path = join(here, "out", `${name}.json`)
	writeFileSync(
		path,
		JSON.stringify({
			count: Object.fromEntries(
				Object.entries(count).filter(([label]) => keep(label))
			)
		})
	)
	return path
}

// count.ts resumes from its out file, so a suite's fresh files start empty
const reset = (...names: string[]) => {
	for (const name of names) rmSync(join(fresh, name), { force: true })
}

const npm = (node: string, cwd: string, ...args: string[]) =>
	run(node, "npm", [...args, "--no-audit", "--no-fund"], {
		cwd,
		env: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" }
	})

const moltar = () => {
	const dir = checkout(
		"moltar",
		"https://github.com/moltar/typescript-runtime-type-benchmarks",
		"499f3fb"
	)
	reset(`moltar-counts${suffix}.json`)
	npm(node24, dir, "ci")
	const compiled = [
		"ata-aot",
		"spectypes",
		"ts-runtime-checks",
		"typebox",
		"ts-auto-guard",
		"type-predicate-generator",
		"paseri-aot",
		"ts-runtypes"
	]
	if (latest) {
		npm(node24, dir, "i", "--save-exact", ...releasesOf("moltar", dir))
		// 0.12 names its factories with an Fn suffix
		const runtypes = join(dir, "cases/ts-runtypes/src/index.ts")
		writeFileSync(
			runtypes,
			readFileSync(runtypes, "utf8").replace(
				/\b(createValidate|createHasUnknownKeys|createCloneExactShape)\b/g,
				"$1Fn"
			)
		)
		// typia 15's transform runs under ttsc, which compiles with TypeScript 7,
		// and its clone moved from misc to plain
		const typia = join(clones, "moltar-typia")
		mkdirSync(join(typia, "src"), { recursive: true })
		writeFileSync(
			join(typia, "package.json"),
			JSON.stringify({
				private: true,
				dependencies:
					newest ?
						{ ttsc: "latest", typescript: "latest", typia: "latest" }
					:	{ ttsc: "0.34.1", typescript: "7.0.2", typia: "15.2.1" }
			})
		)
		writeFileSync(
			join(typia, "src/index.ts"),
			readFileSync(join(dir, "cases/typia/src/index.ts"), "utf8").replace(
				"typia.misc.createClone",
				"typia.plain.createClone"
			)
		)
		writeFileSync(
			join(typia, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					target: "ES2021",
					module: "commonjs",
					strict: true,
					rootDir: "src",
					outDir: join(dir, "cases/typia/build"),
					skipLibCheck: true,
					plugins: [{ transform: "typia/lib/transform", undefined: false }]
				},
				include: ["src"]
			})
		)
		npm(node24, typia, "i")
		run(node24, "npx", ["ttsc", "-p", "tsconfig.json"], { cwd: typia })
	} else compiled.push("typia")
	for (const c of compiled) npm(node24, dir, "run", `compile:${c}`)
	run(node24, process.execPath, [join(here, "moltar/build.ts")])
	run(node24, process.execPath, [join(here, "arms.ts")], {
		env: { MOLTAR: dir, NODE24: node24 }
	})
	const arms = armsOf(
		"arms.json",
		"moltar-arms",
		label =>
			!label.startsWith("sb ") && !/arktype-(b2|dynamic|2\.2\.9)/.test(label)
	)
	count(arms, `moltar-counts${suffix}.json`, 3)
}

const sb = () => {
	const dir = checkout(
		"sb",
		"https://github.com/open-circle/schema-benchmarks",
		latest ? "1c842272" : "94e2dccc"
	)
	const schemas = join(dir, "schemas")
	reset(
		`sb-download${suffix}.json`,
		...(sizeOnly ? [] : [`sb-counts${suffix}.json`])
	)
	const pnpm = (cwd: string, ...args: string[]) =>
		run(node26, "npx", ["-y", "pnpm@11.28.7", ...args], {
			cwd,
			env: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" }
		})
	pnpm(dir, "install", "--frozen-lockfile")
	if (latest) {
		const specs = releasesOf("sb", schemas)
		const isTool = (spec: string) => !!ownerOf(packageOf(spec), releases.sb)
		// the 2026-10-24 run left typia's toolchain at the suite's catalog
		pnpm(schemas, "add", ...specs.filter(spec => newest || !isTool(spec)))
		// the download test builds typia's entry from bench, on bench's own
		// ttsc and unplugin
		const tools = specs.filter(isTool)
		if (newest && tools.length) pnpm(join(dir, "bench"), "add", ...tools)
	}
	// the arktype entries resolve this checkout's arktype
	rmSync(join(schemas, "node_modules/arktype"), {
		recursive: true,
		force: true
	})
	symlinkSync(join(repo, "ark/type"), join(schemas, "node_modules/arktype"))
	cpSync(
		join(here, "sb/precompiled"),
		join(schemas, "libraries/arktype/precompiled"),
		{ recursive: true }
	)
	for (const patch of ["download.patch", "ata.patch"])
		run(node26, "git", ["apply", join(here, "sb", patch)], { cwd: dir })
	run(node26, process.execPath, [join(here, "sb/ataCompiled.ts")], {
		env: { SB: dir }
	})
	run(node26, node26, [join(here, "sb/ajvStandalone.ts")], { env: { SB: dir } })
	run(node26, process.execPath, [join(here, "sb/aotInit.ts")], {
		env: { SB: dir }
	})
	const aot = { ARK_AOT: join(repo, "ark/aot") }
	run(node26, node26, ["libraries/arktype/precompiled/generate.ts"], {
		cwd: schemas,
		env: aot
	})
	run(node26, "npx", ["vp", "pack", "--no-dts"], { cwd: schemas })
	if (!sizeOnly) {
		run(node26, process.execPath, [join(here, "sb/allArms.ts")], {
			env: { SB: dir, SB_NODE: node26 }
		})
		count(join(here, "out/sb-arms.json"), `sb-counts${suffix}.json`, 3)
	}
	// the download test is the suite's own script, the precompiled entry built
	// as a production build resolves the default options. It shells out to
	// pnpm, so it runs under the suite's
	run(
		node26,
		"npx",
		["-y", "pnpm@11.28.7", "exec", "node", "src/scripts/download.ts"],
		{
			cwd: join(dir, "bench"),
			env: {
				...aot,
				ARK_OPTIONS: JSON.stringify({
					freeze: false,
					creationChecks: "none",
					config: false,
					prune: true
				})
			}
		}
	)
	cpSync(
		join(dir, "bench/download.json"),
		join(fresh, `sb-download${suffix}.json`)
	)
}

const sury = () => {
	const dir = checkout("sury", "https://github.com/DZakh/sury", "1f035c5")
	reset(
		`sury-size${suffix}.json`,
		...(sizeOnly ? [] : [`sury-counts${suffix}.json`])
	)
	const pnpm = (cwd: string, ...args: string[]) =>
		run(node24, "npx", ["-y", "pnpm@9.0.5", ...args], { cwd })
	pnpm(
		dir,
		"install",
		"--frozen-lockfile",
		"--filter",
		"benchmarks...",
		"--filter",
		"sury"
	)
	pnpm(join(dir, "packages/sury"), "run", "build:entry")
	if (latest) {
		pnpm(
			join(dir, "packages/benchmarks"),
			"add",
			"-D",
			"--save-exact",
			...releasesOf("sury", join(dir, "packages/benchmarks"))
		)
	}
	const env = { SURY: dir, SURY_NODE: node24 }
	if (!sizeOnly) {
		run(node24, process.execPath, [join(here, "sury/bundle.ts")], { env })
		run(node24, process.execPath, [join(here, "sury/arms.ts")], { env })
		count(join(here, "out/sury-arms.json"), `sury-counts${suffix}.json`, 3)
	}
	run(
		node24,
		process.execPath,
		[join(here, "sury/size.ts"), join(fresh, `sury-size${suffix}.json`)],
		{ env }
	)
}

const ata = () => {
	const dir = checkout(
		"ata",
		"https://github.com/ata-core/validator-benchmarks",
		"8676ca6"
	)
	reset(`ata-counts${suffix}.json`)
	npm(node24, dir, "ci")
	if (latest) npm(node24, dir, "i", "--save-exact", ...releasesOf("ata", dir))
	run(node24, "git", ["apply", join(here, "ata/impls.patch")], { cwd: dir })
	npm(node24, dir, "run", "typia")
	// ata's modules, compiled as its runner compiles them before a run
	const compiled = join(dir, "compiled")
	rmSync(compiled, { recursive: true, force: true })
	mkdirSync(compiled)
	run(
		node24,
		node24,
		[
			"--input-type=module",
			"-e",
			"const { bodies } = await import('./bodies/index.mjs'); const { compileBodies } = await import('./impls/index.mjs'); compileBodies(bodies)"
		],
		{ cwd: dir, env: { TMPDIR: compiled } }
	)
	const env = {
		ATA: dir,
		ATA_NODE: node24,
		ATA_RACE_COMPILED: join(compiled, readdirSync(compiled)[0]),
		ARK_VALIDATORS: join(here, "ata/out/validators.js")
	}
	run(node24, process.execPath, [join(here, "ata/build.ts")])
	run(node24, process.execPath, [join(here, "ata/arms.ts")], { env })
	const out = `ata-counts${suffix}.json`
	const isConfig = (label: string) => label.includes("|config|")
	count(
		armsOf("ata-arms.json", "ata-main-arms", l => !isConfig(l)),
		out,
		3,
		env
	)
	// the config body's tiering outlasts a second's warmup
	count(armsOf("ata-arms.json", "ata-config-arms", isConfig), out, 5, {
		...env,
		COUNT_WARM_US: "5000000"
	})
}

const form = () => {
	const forms = join(here, "forms")
	npm(node24, forms, "i")
	// zod, typia and ttsc otherwise resolve from ark/repo
	if (newest) npm(node24, forms, "i", "--no-save", ...releasesOf("form", forms))
	run(
		node24,
		join(newest ? forms : join(repo, "ark/repo"), "node_modules/.bin/ttsc"),
		["--project", join(forms, "tsconfig.typia.json")]
	)
	run(node24, process.execPath, [
		join(forms, "size.ts"),
		join(fresh, `forms${suffix}.json`),
		join(fresh, `forms-behavior${suffix}.json`)
	])
}

const startup = () => {
	run(node24, process.execPath, [join(here, "../generateTypia.ts")])
	run(
		node24,
		process.execPath,
		[join(here, "startup.ts"), join(fresh, "startup.json"), "20"],
		{
			env: { STARTUP_BUILDS: '{"default":{}}', STARTUP_NODE: node24 }
		}
	)
}

// startup.ts has no rivals of its own to update, and the form's were the
// latest on 2026-10-24
const suites = {
	moltar,
	sb,
	sury,
	ata,
	...((!latest || newest) && { form }),
	...(!latest && { startup })
}

const failureOf = (suite: () => void) => {
	try {
		suite()
	} catch (e) {
		console.error(e)
		return e
	}
}

// runs a suite. With --newest, one that fails with a rival that has a build
// step is run again, since ttsc's first Go build of typia's plugin can fail,
// then once more with each such rival held at the last release the suite
// built. It throws if that fails too, or if no rival is left to hold
const runSuite = (name: keyof typeof suites) => {
	const suite = suites[name]!
	const builds =
		newest &&
		name !== "startup" &&
		releases[name].some(release => packageOf(release) in toolchains)
	if (!builds) return suite()
	let failure = failureOf(suite)
	if (!failure) return
	console.log(`\n${name} failed: running it again`)
	failure = failureOf(suite)
	if (!failure) return
	const holds = holdsFor({
		releases: releases[name],
		last: lastRuns[name]?.installed ?? {},
		latest: Object.fromEntries(
			Object.keys(toolchains).map(rival => [
				rival,
				npmView(`${rival}@latest`, "version")
			])
		)
	})
	if (!Object.keys(holds).length) throw failure
	for (const [rival, { newest, kept }] of Object.entries(holds)) {
		console.log(
			`\n${name} failed twice: running it with ${rival} at ${kept}, the last release it built, in place of ${newest}`
		)
	}
	held[name] = holds
	suite()
}

const started = Date.now()
mkdirSync(fresh, { recursive: true })
if (target === "all")
	for (const name of Object.keys(suites)) runSuite(name as keyof typeof suites)
else if (sizeOnly)
	for (const name of ["form", "sb", "sury"] as const) runSuite(name)
else if (target in suites) runSuite(target as keyof typeof suites)
else {
	throw new Error(
		`Unknown suite ${target}: one of ${Object.keys(suites)}, size, all`
	)
}

// the newest run's results, as leaderboard.ts reads them, with each suite's
// commit, date and installs in run.json, and the published leaderboard
// rewritten from them
if (newest) {
	const kept = join(here, "results", "newest")
	mkdirSync(kept, { recursive: true })
	for (const name of readdirSync(fresh)) {
		if (
			name.endsWith("-newest.json") &&
			statSync(join(fresh, name)).mtimeMs >= started
		)
			cpSync(join(fresh, name), join(kept, name.replace("-newest", "")))
	}
	const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
		cwd: repo,
		encoding: "utf8"
	}).stdout.trim()
	const date = new Date().toISOString().slice(0, 10)
	const runs: Partial<Record<Suite, RunRecord>> = { ...lastRuns }
	for (const [suite, dir] of Object.entries(installs) as [Suite, string][]) {
		runs[suite] = {
			commit,
			date,
			installed: installedIn(suite, dir),
			...(held[suite] && { held: held[suite] })
		}
	}
	writeFileSync(runPath, `${JSON.stringify(runs, null, "\t")}\n`)
	run(node24, join(repo, "node_modules/.bin/prettier"), ["--write", kept])
	run(node24, process.execPath, [join(here, "leaderboard.ts")])
}

run(node24, process.execPath, [join(here, "leaderboard.ts")], {
	env: { LEADERBOARD_FRESH: fresh }
})
console.log("\npublished (ark/docs/lib/bench/leaderboard.json):")
run(node24, process.execPath, [join(here, "standings.ts")])
console.log(`\nfresh (${join(fresh, "leaderboard.json")}):`)
run(node24, process.execPath, [join(here, "standings.ts")], {
	env: { LEADERBOARD_FRESH: fresh }
})
