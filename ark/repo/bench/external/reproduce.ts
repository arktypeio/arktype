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
// it beside the committed results to rewrite the published leaderboard.
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
	sb: ["ata-validator@1.60.0", "typia@15.2.1"],
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

const packageOf = (release: string) => release.replace(/(.)@.*$/, "$1")

// where each suite this run updated installed its rivals
const installs: Partial<Record<keyof typeof releases, string>> = {}

// a suite's rivals to install into dir: with --newest, each at its newest
// release
const releasesOf = (suite: keyof typeof releases, dir: string) => {
	installs[suite] = dir
	return releases[suite].map(release =>
		newest ? `${packageOf(release)}@latest` : release
	)
}

// the version of each rival a suite installed
const installedIn = (suite: keyof typeof releases, dir: string) =>
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
	if (latest) pnpm(schemas, "add", ...releasesOf("sb", schemas))
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

const started = Date.now()
mkdirSync(fresh, { recursive: true })
if (target === "all") for (const suite of Object.values(suites)) suite()
else if (sizeOnly) for (const suite of [form, sb, sury]) suite()
else if (target in suites) suites[target as keyof typeof suites]!()
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
	const runPath = join(kept, "run.json")
	const runs =
		existsSync(runPath) ? JSON.parse(readFileSync(runPath, "utf8")) : {}
	for (const [suite, dir] of Object.entries(installs)) {
		runs[suite] = {
			commit,
			date,
			installed: installedIn(suite as keyof typeof releases, dir)
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
