import { fromHere } from "@ark/fs"
import { precompile } from "@ark/precompile/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// checks the environment matrix of the precompilation design (design/precompile.md §12):
// a program built under UTC and en-US prints what it prints as written, in other time zones and
// locales, without evaluating strings and on Bun:
// pnpm testEnvironments

const program = fromHere("environments")

const conditions = ["ark-ts"]

type Mode = "standalone" | "cache"

const modes: Mode[] = ["standalone", "cache"]

const buildEnv = { TZ: "UTC", LANG: "en_US.UTF-8", LC_ALL: "" }

if (process.argv[2] === "--build") {
	const { outputFiles } = await build({
		entryPoints: [join(program, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [
			precompile.esbuild({
				runtime: process.argv[3] === "cache" ? "arktype" : undefined,
				conditions,
				cwd: program
			})
		]
	})
	writeFileSync(process.argv[4], outputFiles[0].text)
	process.exit()
}

const spawn = (command: string, args: string[], env: object) => {
	const result = spawnSync(command, args, {
		cwd: program,
		encoding: "utf8",
		env: { ...process.env, ...env },
		maxBuffer: 1 << 30
	})
	if (result.status !== 0)
		throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr}`)
	return result.stdout
}

const out = mkdtempSync(join(tmpdir(), "ark-environments-"))

const buildIn = (mode: Mode, env: object, name: string) => {
	const path = join(out, `${name}.js`)
	spawn(
		process.execPath,
		["--conditions", "ark-ts", import.meta.filename, "--build", mode, path],
		env
	)
	return path
}

const bundles = Object.fromEntries(
	modes.map(mode => {
		const path = buildIn(mode, buildEnv, mode)
		const elsewhere = buildIn(
			mode,
			{ TZ: "Asia/Kolkata", LANG: "de_DE.UTF-8", LC_ALL: "de_DE.UTF-8" },
			`${mode}-elsewhere`
		)
		// the build is the same whatever the build machine's time zone and locale
		if (readFileSync(elsewhere, "utf8") !== readFileSync(path, "utf8"))
			throw new Error(`the ${mode} build differs under Asia/Kolkata and de_DE`)
		return [mode, path]
	})
)

const environments: Record<string, object> = {
	reference: buildEnv,
	"America/New_York": { ...buildEnv, TZ: "America/New_York" },
	"Asia/Kolkata": { ...buildEnv, TZ: "Asia/Kolkata" },
	"Pacific/Kiritimati": { ...buildEnv, TZ: "Pacific/Kiritimati" },
	de_DE: { ...buildEnv, LANG: "de_DE.UTF-8", LC_ALL: "de_DE.UTF-8" }
}

const node = [process.execPath, "--conditions", "ark-ts"]

const runtimes: Record<string, string[]> = {
	node,
	"node --disallow-code-generation-from-strings": [
		...node,
		"--disallow-code-generation-from-strings"
	]
}

// Bun is optional, so it runs where it is installed
if (spawnSync("bun", ["--version"]).status === 0)
	runtimes.bun = ["bun", "--conditions", "ark-ts"]
else console.log("⚠️  bun is not installed")

interface Output {
	portable: unknown
	local: unknown
}

const run = (runtime: string[], entry: string, env: object): Output =>
	JSON.parse(spawn(runtime[0], [...runtime.slice(1), entry], env))

const reference = run(node, bundles.standalone, buildEnv)

let runs = 0
let failures = 0

for (const [runtimeName, runtime] of Object.entries(runtimes)) {
	for (const [envName, env] of Object.entries(environments)) {
		const asWritten = run(runtime, "main.ts", env)
		// what reads the local time zone is compared with arktype's where it runs
		const expected = { portable: reference.portable, local: asWritten.local }
		for (const [name, entry] of [
			["as written", "main.ts"],
			...Object.entries(bundles)
		]) {
			const output = entry === "main.ts" ? asWritten : run(runtime, entry, env)
			const differing = (["portable", "local"] as const).filter(
				k => JSON.stringify(output[k]) !== JSON.stringify(expected[k])
			)
			runs++
			if (!differing.length) continue
			failures++
			console.log(`\n✗ ${runtimeName}, ${envName}, ${name}`)
			for (const k of differing) {
				console.log(`  ${k} expected ${JSON.stringify(expected[k])}`)
				console.log(`  ${k} actual   ${JSON.stringify(output[k])}`)
			}
		}
	}
}

console.log(
	`\n${failures ? "❌" : "✅"} ${runs} runs over ${Object.keys(runtimes).join(", ")}, ${failures} differing`
)
if (failures) process.exitCode = 1
