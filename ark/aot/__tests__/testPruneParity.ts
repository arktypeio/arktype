// checks that a production bundle leaving out what no read needs validates as
// one built whole: for each bench app and one of shapes they lack, each preset
// and way a program reads its validators, both bundles run every input through
// each validator and must return the same. Negative controls first show the
// comparison catches a changed message and a dropped check. pnpm testPruneParity
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
	samplesByApp as benchSamplesByApp,
	testedSamplesByApp,
	values
} from "./pruneSamples.ts"

const samplesByApp = { ...benchSamplesByApp, ...testedSamplesByApp }

const appsOf = (app: string) =>
	app in testedSamplesByApp ?
		fromHere("pruned")
	:	fromHere("..", "..", "repo", "bench", "apps")

// how a program reads each validator, as a handler of its data
const profiles = {
	call: (name: string) =>
		`d => { const out = ${name}(d); return out instanceof type.errors ? { summary: out.summary, issues: out.issues } : { data: out } }`,
	allows: (name: string) => `d => ${name}.allows(d)`,
	assert: (name: string) =>
		`d => { try { return { data: ${name}.assert(d) } } catch (e) { return { thrown: String(e) } } }`,
	standard: (name: string) => `d => ${name}["~standard"].validate(d)`
}

type Profile = keyof typeof profiles

const presets: Record<string, PrecompileUnpluginOptions> = {
	default: {},
	smallest: { preset: "smallest" }
}

const dir = mkdtempSync(join(tmpdir(), "ark-prune-parity-"))
let bundles = 0

type Handlers = Record<string, (data: unknown) => unknown>

// a production bundle of handlers reading each of an app's validators
const bundle = async (
	app: string,
	profile: Profile,
	opts: PrecompileUnpluginOptions,
	mutate: (js: string) => string = js => js
): Promise<{ handlers: Handlers; js: string }> => {
	const apps = appsOf(app)
	const names = Object.keys(await import(join(apps, app, "arktype.ts")))
	const { outputFiles } = await build({
		stdin: {
			contents: `import { type } from "arktype"
import { ${names.join(", ")} } from "./${app}/arktype.ts"

export const handlers = {
${names.map(name => `\t${name}: ${profiles[profile](name)}`).join(",\n")}
}
`,
			resolveDir: apps,
			loader: "ts"
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		write: false,
		logLevel: "error",
		conditions: ["production"],
		plugins: [precompile.esbuild({ cwd: apps, ...opts })]
	})
	const js = mutate(outputFiles[0].text)
	const file = join(dir, `${bundles++}.mjs`)
	writeFileSync(file, js)
	return { handlers: (await import(pathToFileURL(file).href)).handlers, js }
}

// each validator's samples, every single mutation of them (a key deleted or
// set to each value), and every other validator's samples
const inputsOf = (app: string, name: string): (() => unknown)[] => {
	const samples = samplesByApp[app]
	const inputs = Object.values(samples)
		.flat()
		.map(make => () => copy(make()))
	for (const make of samples[name] ?? []) {
		for (const path of pathsOf(make())) {
			inputs.push(() => mutated(make, path, { delete: true }))
			for (const value of values)
				inputs.push(() => mutated(make, path, { value: copy(value) }))
		}
	}
	return inputs
}

const pathsOf = (v: unknown, at: PropertyKey[] = []): PropertyKey[][] => {
	const result = [at]
	if (v && typeof v === "object") {
		for (const k of Object.keys(v)) {
			result.push(
				...pathsOf((v as never)[k], [...at, Array.isArray(v) ? Number(k) : k])
			)
		}
	}
	return result
}

const mutated = (
	make: () => unknown,
	path: PropertyKey[],
	mutation: { delete: true } | { value: unknown }
): unknown => {
	if (!path.length) return "delete" in mutation ? undefined : mutation.value
	const root = make() as Record<PropertyKey, any>
	let parent = root
	for (const k of path.slice(0, -1)) parent = parent[k]
	const k = path[path.length - 1]
	if ("delete" in mutation) delete parent[k]
	else parent[k] = mutation.value
	return root
}

const copy = (v: unknown): unknown =>
	Array.isArray(v) ? v.map(copy)
	: v && typeof v === "object" ?
		Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)]))
	:	v

// what a handler returns, comparable across bundles
const show = (v: unknown): string =>
	JSON.stringify(v, (_, x) =>
		typeof x === "function" ? "function"
		: typeof x === "number" && !Number.isFinite(x) ? String(x)
		: x === undefined ? "undefined"
		: x
	)

// how many inputs each validator handles differently in the two bundles
const differencesOf = (
	app: string,
	expected: Handlers,
	actual: Handlers
): number => {
	let differences = 0
	for (const name in expected) {
		for (const input of inputsOf(app, name)) {
			if (show(expected[name](input())) !== show(actual[name](input())))
				differences++
		}
	}
	return differences
}

const failures: string[] = []

// a parity check that can't see a changed message or a dropped check proves
// nothing
for (const app of Object.keys(samplesByApp)) {
	const whole = await bundle(app, "call", { prune: false })
	const reworded = await bundle(app, "call", { prune: false }, js =>
		js.replace(/must be /g, "must  be ")
	)
	const accepting = Object.fromEntries(
		Object.keys(whole.handlers).map(name => [
			name,
			(data: unknown) => ({ data })
		])
	)
	const rewordings = differencesOf(app, whole.handlers, reworded.handlers)
	const acceptances = differencesOf(app, whole.handlers, accepting)
	console.log(
		`control ${app}: reworded ${rewordings}, accepting ${acceptances}`
	)
	if (!rewordings || !acceptances)
		failures.push(`${app}'s control found nothing`)
}

for (const app of Object.keys(samplesByApp)) {
	for (const [preset, opts] of Object.entries(presets)) {
		for (const profile of Object.keys(profiles) as Profile[]) {
			const whole = await bundle(app, profile, { ...opts, prune: false })
			const pruned = await bundle(app, profile, opts)
			// identical bundles would compare nothing
			if (pruned.js.length >= whole.js.length)
				failures.push(`${app} ${preset} ${profile} left nothing out`)
			const differences = differencesOf(app, whole.handlers, pruned.handlers)
			const saved = whole.js.length - pruned.js.length
			console.log(
				`${app} ${preset} ${profile}: ${differences} differences, ${saved} B min saved`
			)
			if (differences)
				failures.push(`${app} ${preset} ${profile}: ${differences} differences`)
		}
	}
}

rmSync(dir, { recursive: true, force: true })
if (failures.length) {
	console.error(failures.join("\n"))
	process.exit(1)
}
