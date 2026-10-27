// The procedure registered before the run behind the precompile docs' "Build
// time" claims (ark/docs/lib/claims.ts): a generated app of 11, 92 and 1012
// Types, built with and without the plugin on esbuild, Vite and Next
// (Turbopack), each run started at a 1-minute load under BENCH_MAX_LOAD (4).
// Each run appends a row to results/<commit>.jsonl, and the medians are
// written to ark/docs/lib/bench/buildTime.json.
//
// Run `pnpm build` first: the apps install arktype and @ark/aot from tarballs
// of their builds, as an app installs them from npm. Dev servers are loaded
// by Playwright's Chromium (`pnpm dlx playwright-core@1.64.0 install chromium`).
//
// usage: pnpm benchBuildTime [build|dev|edit...]  (every phase by default)
//        pnpm benchBuildTime summarize <commit>   (rewrites the docs' medians
//                                                  from results/<commit>.jsonl)
import { execSync } from "node:child_process"
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { loadavg, tmpdir } from "node:os"
import { join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { appOf, sizes, writeApp, type Size } from "./apps.ts"
import {
	build,
	clean,
	dev,
	rebuilds,
	type Arm,
	type Browser,
	type Bundler,
	type Measured
} from "./measure.ts"

const ark = join(import.meta.dirname, "..", "..", "..")
const results = join(import.meta.dirname, "results")
const docsJson = join(ark, "docs", "lib", "bench", "buildTime.json")
const workDir = join(tmpdir(), "arktype-buildTime")
const maxLoad = Number(process.env.BENCH_MAX_LOAD ?? 4)
const sizeNames = Object.keys(sizes) as Size[]

// as built from the workspace, everything else pinned
const packed = ["util", "schema", "regex", "sets", "type", "aot"]
const pinned = {
	esbuild: "0.25.10",
	next: "16.4.1",
	react: "19.2.9",
	"react-dom": "19.2.9",
	vite: "8.3.4",
	typescript: "6.0.3",
	"@types/react": "19.2.18",
	"@types/react-dom": "19.2.7",
	"@types/node": "24.7.2",
	"playwright-core": "1.64.0"
}

// packs the workspace's builds, then installs them beside the bundlers
const install = () => {
	rmSync(workDir, { recursive: true, force: true })
	const tarballs = join(workDir, "tarballs")
	mkdirSync(tarballs, { recursive: true })
	const overrides: Record<string, string> = {}
	for (const dir of packed) {
		const root = join(ark, dir)
		if (!existsSync(join(root, "out")))
			throw new Error(`${root} isn't built: run \`pnpm build\` first`)
		const { name, version } = JSON.parse(
			readFileSync(join(root, "package.json"), "utf8")
		)
		execSync(`pnpm pack --pack-destination ${tarballs}`, {
			cwd: root,
			stdio: "ignore"
		})
		const tarball = `${name.replace("@", "").replace("/", "-")}-${version}.tgz`
		if (!readdirSync(tarballs).includes(tarball))
			throw new Error(`pnpm pack wrote no ${tarball}`)
		overrides[name] = `file:./tarballs/${tarball}`
	}
	writeFileSync(
		join(workDir, "package.json"),
		JSON.stringify({
			private: true,
			type: "module",
			dependencies: {
				"@ark/aot": overrides["@ark/aot"],
				arktype: overrides.arktype,
				...pinned
			},
			pnpm: { overrides, onlyBuiltDependencies: ["esbuild"] }
		})
	)
	execSync("pnpm i --ignore-workspace --prefer-offline", {
		cwd: workDir,
		stdio: "inherit"
	})
	for (const size of sizeNames)
		writeApp(appOf(size, workDir), join(workDir, "apps", size))
}

const arms = ["off", "on"] as const

type Metric = "build" | "dev" | "edit"

type EditMode = "development" | "production"

interface Row {
	metric: Metric
	bundler: Bundler
	size: Size
	mode?: EditMode | undefined
	at: string
	arm: string
	run: number
	load: number
	ok: boolean
	ms?: number
	edits?: (number | null)[]
	/** what the febe60baf run called edits */
	hmr?: (number | null)[]
	error?: string
}

interface Cell {
	metric: Metric
	bundler: Bundler
	size: Size
	runs: number
	mode?: EditMode
	/** edits timed in each of the first editRuns runs */
	edits?: number
	editRuns?: number
}

const waitForLoad = async () => {
	for (let waited = 0; loadavg()[0] >= maxLoad; waited++) {
		if (waited % 30 === 0)
			console.log(`waiting for load < ${maxLoad} (${loadavg()[0].toFixed(1)})`)
		await sleep(10_000)
	}
	return loadavg()[0]
}

// every arm is run once per run, in an order that rotates by run
const measureCell = async (
	cell: Cell,
	out: string,
	browser: () => Promise<Browser>
) => {
	for (let run = 0; run < cell.runs; run++) {
		const edits = run < (cell.editRuns ?? cell.runs) ? (cell.edits ?? 0) : 0
		for (let i = 0; i < arms.length; i++) {
			const name = arms[(i + run) % arms.length]
			const arm: Arm = {
				app: join(workDir, "apps", cell.size),
				bundler: cell.bundler,
				precompiled: name === "on"
			}
			clean(arm.app)
			const load = await waitForLoad()
			const measured: Measured =
				cell.metric === "build" ? await build(arm)
				: cell.metric === "dev" ?
					await dev(arm, await browser(), 5300 + run, edits)
				:	await rebuilds(arm, edits, cell.mode!)
			const row: Row = {
				metric: cell.metric,
				bundler: cell.bundler,
				size: cell.size,
				mode: cell.mode,
				at: new Date().toISOString(),
				arm: name,
				run,
				load: Number(load.toFixed(2)),
				...measured
			}
			appendFileSync(out, `${JSON.stringify(row)}\n`)
			console.log(JSON.stringify(row))
		}
	}
}

const phases: Record<Metric, Cell[]> = {
	build: sizeNames.flatMap(size =>
		(["esbuild", "vite", "next"] as const).map(
			(bundler): Cell => ({ metric: "build", bundler, size, runs: 7 })
		)
	),
	dev: sizeNames.flatMap(size =>
		(["vite", "next"] as const).map(
			(bundler): Cell => ({
				metric: "dev",
				bundler,
				size,
				runs: 5,
				edits: 10,
				editRuns: 3
			})
		)
	),
	edit: sizeNames.flatMap(size =>
		(["development", "production"] as const).map(
			(mode): Cell => ({
				metric: "edit",
				bundler: "esbuild",
				size,
				mode,
				runs: 3,
				edits: 10
			})
		)
	)
}

interface Stats {
	median: number
	min: number
	max: number
	n: number
}

const statsOf = (values: number[]): Stats => {
	const sorted = [...values].sort((a, b) => a - b)
	const middle = (sorted.length - 1) / 2
	const median = (sorted[Math.floor(middle)] + sorted[Math.ceil(middle)]) / 2
	return {
		median: Math.round(median),
		min: Math.round(sorted[0]),
		max: Math.round(sorted[sorted.length - 1]),
		n: sorted.length
	}
}

const summarize = (commit: string) => {
	const rows: Row[] = readFileSync(join(results, `${commit}.jsonl`), "utf8")
		.trim()
		.split("\n")
		.map(line => JSON.parse(line))
	const timesByCell: Record<string, number[]> = {}
	let failed = 0
	const add = (cell: string, ms: number | null | undefined) => {
		timesByCell[cell] ??= []
		if (typeof ms === "number") timesByCell[cell].push(ms)
		else failed++
	}
	for (const row of rows) {
		// the febe60baf run named the plugin's arm "after"
		const arm = row.arm === "after" ? "on" : row.arm
		const cell = [row.metric, row.bundler, row.size, row.mode, arm]
			.filter(Boolean)
			.join(" ")
		add(
			`${cell} ${row.metric === "build" ? "build" : "startup"}`,
			row.ok ? row.ms : null
		)
		for (const ms of row.edits ?? row.hmr ?? [])
			add(`${cell} ${row.metric === "dev" ? "hmr" : "rebuild"}`, ms)
	}
	const cells: Record<string, Stats> = {}
	for (const [cell, times] of Object.entries(timesByCell))
		cells[cell] = statsOf(times)
	const apps = sizeNames.map(size => appOf(size, workDir))
	const summary = {
		commit,
		types: Object.fromEntries(
			sizeNames.map((size, i) => [size, apps[i].types])
		),
		domains: Object.fromEntries(
			sizeNames.map((size, i) => [size, apps[i].domains])
		),
		cells
	}
	writeFileSync(docsJson, `${JSON.stringify(summary, null, "\t")}\n`)
	console.log(
		`${rows.length} runs, ${failed} failed or untimed, ${Math.max(...rows.map(row => row.load))} highest load at a start: wrote ${docsJson}`
	)
}

if (process.argv[2] === "summarize") summarize(process.argv[3])
else {
	const metrics = (
		process.argv.length > 2 ?
			process.argv.slice(2)
		:	Object.keys(phases)) as Metric[]
	for (const metric of metrics) {
		if (!(metric in phases))
			throw new Error(`No phase ${metric}: build, dev or edit`)
	}
	const commit = execSync("git rev-parse --short=9 HEAD", {
		encoding: "utf8"
	}).trim()
	const out = join(results, `${commit}.jsonl`)
	install()
	const { chromium } = createRequire(join(workDir, "package.json"))(
		"playwright-core"
	) as { chromium: { launch(): Promise<Browser & { close(): Promise<void> }> } }
	// launched for the first dev server
	let launched: ReturnType<typeof chromium.launch> | undefined
	const browser = () => (launched ??= chromium.launch())
	try {
		for (const metric of metrics)
			for (const cell of phases[metric]) await measureCell(cell, out, browser)
	} finally {
		await (await launched)?.close()
	}
	summarize(commit)
	// a dev server's grandchildren can hold its pipes open
	process.exit(0)
}
