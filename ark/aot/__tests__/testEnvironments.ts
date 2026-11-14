import { fromHere } from "@ark/fs"
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { tempDir } from "./utils.ts"

// a program built under UTC and en-US prints what it prints as written in
// other time zones and locales, without evaluating strings, and on Bun,
// Deno, Chromium and Firefox where installed (CHROME_BIN and FIREFOX_BIN
// name a browser off the PATH): pnpm testEnvironments

const program = fromHere("environments")

const conditions = ["ark-ts"]

type Mode = "standalone" | "cache"

const modes: Mode[] = ["standalone", "cache"]

const buildEnv = { TZ: "UTC", LANG: "en_US.UTF-8", LC_ALL: "" }

// a runtime that can't read TypeScript runs a bundle built without the plugin
if (process.argv[2] === "--build") {
	const { outputFiles } = await build({
		entryPoints: [join(program, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins:
			process.argv[3] === "written" ?
				[]
			:	[
					precompile.esbuild({
						...(process.argv[3] === "cache" ?
							{ runtime: "arktype" }
						:	{ members: { expression: true, description: true } }),
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

const out = tempDir("ark-environments-")

const buildIn = (mode: Mode | "written", env: object, name: string) => {
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

const environments: Record<string, Record<string, string>> = {
	reference: buildEnv,
	"America/New_York": { ...buildEnv, TZ: "America/New_York" },
	"Asia/Kolkata": { ...buildEnv, TZ: "Asia/Kolkata" },
	"Pacific/Kiritimati": { ...buildEnv, TZ: "Pacific/Kiritimati" },
	de_DE: { ...buildEnv, LANG: "de_DE.UTF-8", LC_ALL: "de_DE.UTF-8" }
}

const written = buildIn("written", buildEnv, "written")

interface Output {
	portable: unknown
	local: unknown
}

interface Runtime {
	// main.ts where the runtime reads TypeScript, else the plain bundle
	asWritten: string
	run: (entry: string, env: Record<string, string>) => Output
}

const command =
	(...prefix: string[]): Runtime["run"] =>
	(entry, env) =>
		JSON.parse(spawn(prefix[0], [...prefix.slice(1), entry], env))

const runtimes: Record<string, Runtime> = {
	node: {
		asWritten: "main.ts",
		run: command(process.execPath, "--conditions", "ark-ts")
	},
	"node --disallow-code-generation-from-strings": {
		asWritten: "main.ts",
		run: command(
			process.execPath,
			"--conditions",
			"ark-ts",
			"--disallow-code-generation-from-strings"
		)
	}
}

const isInstalled = (command: string | undefined, version: RegExp) =>
	!!command &&
	version.test(spawnSync(command, ["--version"], { encoding: "utf8" }).stdout)

if (isInstalled("bun", /^\d/)) {
	runtimes.bun = {
		asWritten: "main.ts",
		run: command("bun", "--conditions", "ark-ts")
	}
} else console.log("⚠️  bun is not installed")

if (isInstalled("deno", /^deno /))
	runtimes.deno = { asWritten: written, run: command("deno", "run", "--quiet") }
else console.log("⚠️  deno is not installed")

// a page runs a bundle as a module, reporting what it printed in base64
const writePage = (entry: string) => {
	const path = `${entry}.html`
	writeFileSync(
		path,
		`<!doctype html>
<script>
const report = s => {
	const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(s)))
	document.body.textContent = encoded
	if (typeof dump === "function") dump(\`ark:\${encoded}\\n\`)
}
console.log = report
addEventListener("error", e => report(JSON.stringify({ error: String(e.message) })))
</script>
<script type="module">
${readFileSync(entry, "utf8").replace(/<\/script/g, "<\\/script")}
</script>`
	)
	return pathToFileURL(path).href
}

const decode = (encoded: string | undefined): Output => {
	if (!encoded) throw new Error("the page printed nothing")
	return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))
}

const chrome = [
	process.env.CHROME_BIN,
	"chromium",
	"chromium-browser",
	"google-chrome",
	"chrome-headless-shell"
].find(command => isInstalled(command, /chrom/i))

if (chrome) {
	runtimes.chromium = {
		asWritten: written,
		run: (entry, env) =>
			decode(
				/<body>([\w+/=]*)<\/body><\/html>\s*$/.exec(
					spawn(
						chrome,
						[
							"--headless",
							"--no-sandbox",
							"--disable-gpu",
							`--lang=${env.LANG.split(".")[0].replace("_", "-")}`,
							"--dump-dom",
							writePage(entry)
						],
						env
					)
				)?.[1]
			)
	}
} else console.log("⚠️  chromium is not installed")

// only a profile can let a page print to stdout
const profile = join(out, "firefox")
mkdirSync(profile)
writeFileSync(
	join(profile, "user.js"),
	'user_pref("browser.dom.window.dump.enabled", true);\n'
)

const firefoxArgs = (page: string) => [
	"-headless",
	"-no-remote",
	"-profile",
	profile,
	"--screenshot",
	join(out, "firefox.png"),
	page
]

// a snap's Firefox can't read a profile outside home, so try a blank page
const firefox = [process.env.FIREFOX_BIN, "firefox"].find(
	command =>
		command && spawnSync(command, firefoxArgs("about:blank")).status === 0
)

if (firefox) {
	runtimes.firefox = {
		asWritten: written,
		run: (entry, env) =>
			decode(
				/^ark:(.*)$/m.exec(
					spawn(firefox, firefoxArgs(writePage(entry)), env)
				)?.[1]
			)
	}
} else console.log("⚠️  firefox is not installed or can't run headless")

// a runtime CI stops installing would otherwise be skipped silently
const missing = ["bun", "deno", "chromium", "firefox"].filter(
	name => !(name in runtimes)
)
if (process.env.CI && missing.length)
	throw new Error(`CI must run every runtime, missing ${missing.join(", ")}`)

let runs = 0
let failures = 0

for (const [runtimeName, runtime] of Object.entries(runtimes)) {
	// engines can differ as written, so each is compared with itself
	const { portable } = runtime.run(runtime.asWritten, buildEnv)
	for (const [envName, env] of Object.entries(environments)) {
		const asWritten = runtime.run(runtime.asWritten, env)
		// what reads the local time zone is compared with arktype's where it runs
		const expected = { portable, local: asWritten.local }
		for (const [name, entry] of [
			["as written", runtime.asWritten],
			...Object.entries(bundles)
		]) {
			const output =
				entry === runtime.asWritten ? asWritten : runtime.run(entry, env)
			const differing = (["portable", "local"] as const).filter(
				k => JSON.stringify(output[k]) !== JSON.stringify(expected[k])
			)
			runs++
			if (!differing.length) continue
			failures++
			console.log(`\n✗ ${runtimeName}, ${envName}, ${name}`)
			for (const k of differing) {
				console.log(`  ${k} expected ${JSON.stringify(expected[k])}`)
				console.log(`  ${k} actual   ${JSON.stringify(output[k] ?? output)}`)
			}
		}
	}
}

console.log(
	`\n${failures ? "❌" : "✅"} ${runs} runs over ${Object.keys(runtimes).join(", ")}, ${failures} differing`
)
if (failures) process.exitCode = 1
