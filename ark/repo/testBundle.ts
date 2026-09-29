import { fromHere } from "@ark/fs"
import { build } from "esbuild"
import { gzipSync } from "node:zlib"

console.log(
	"📦 Checking that a bundle of @ark/schema alone contains no set algebra...\n"
)

// strings unique to arksets. if one survives into a bundle of @ark/schema
// alone, the algebra (or JSON Schema generation, which ships with it) is
// reachable from the schema language and the seam is breached.
const algebraMarkers = [
	"The intersection of two ordered unions is indeterminate",
	"An unordered union of a type including a morph",
	"Unexpectedly encountered multiple distinct intersection results",
	// the $defs key is written only when generating a schema with refs
	"$defs"
]

const bundle = async (entry: string) => {
	const result = await build({
		entryPoints: [fromHere("..", entry)],
		absWorkingDir: fromHere(".."),
		bundle: true,
		minify: true,
		platform: "neutral",
		conditions: ["ark-ts"],
		write: false,
		metafile: true,
		logLevel: "error"
	})
	return {
		js: result.outputFiles[0].text,
		// every module the bundle loaded, relative to ark/
		modules: Object.keys(result.metafile.inputs)
	}
}

const describe = (name: string, js: string) =>
	`${name.padEnd(20)} ${String(js.length).padStart(7)} min ${String(gzipSync(js).length).padStart(6)} gzip`

const schema = await bundle("schema/index.ts")
const sets = await bundle("sets/index.ts")
const type = await bundle("type/index.ts")
const runtime = await bundle("schema/runtime.ts")

console.log(describe("@ark/schema", schema.js))
console.log(describe("arksets", sets.js))
console.log(describe("arktype", type.js))
console.log(describe("@ark/schema/runtime", runtime.js))
console.log()

const breaches = algebraMarkers.filter(marker => schema.js.includes(marker))

if (breaches.length) {
	throw new Error(
		`⚠️  @ark/schema bundle includes set algebra:\n${breaches.map(marker => `  ${marker}`).join("\n")}`
	)
}

console.log("🪶 @ark/schema bundles without set algebra!")

// @ark/schema/runtime runs emitted code without node code, so these are the
// only @ark/schema modules it may reach. None defines nodes or scopes,
// compiles or parses. shared/ also holds modules that do (compile.ts,
// implement.ts, disjoint.ts...), so a module belongs here only if it does
// none of those.
const runtimeModules = new Set([
	"schema/runtime.ts",
	"schema/shared/errors.ts",
	"schema/shared/errorWriters.ts",
	"schema/shared/registry.ts",
	"schema/shared/traversal.ts",
	"schema/shared/utils.ts"
])

const nodeModules = runtime.modules.filter(
	path => path.startsWith("schema/") && !runtimeModules.has(path)
)

if (nodeModules.length) {
	throw new Error(
		`⚠️  @ark/schema/runtime bundle includes node code:\n${nodeModules.map(path => `  ${path}`).join("\n")}`
	)
}

console.log("🪶 @ark/schema/runtime bundles without node, scope or parse code!")
