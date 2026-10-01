import { fromHere } from "@ark/fs"
import { build } from "esbuild"
import { gzipSync } from "node:zlib"

console.log(
	"📦 Checking that a bundle of @ark/schema alone contains no set algebra...\n"
)

const algebraMarkers = [
	"The intersection of two ordered unions is indeterminate",
	"An unordered union of a type including a morph",
	"Unexpectedly encountered multiple distinct intersection results",
	// written only by JSON Schema generation, which ships with the algebra
	"$defs"
]

const bundle = async (entry: string) => {
	const result = await build({
		entryPoints: [fromHere("..", entry)],
		bundle: true,
		minify: true,
		platform: "neutral",
		conditions: ["ark-ts"],
		write: false,
		logLevel: "error"
	})
	return result.outputFiles[0].text
}

const describe = (name: string, js: string) =>
	`${name.padEnd(12)} ${String(js.length).padStart(7)} min ${String(gzipSync(js).length).padStart(6)} gzip`

const schema = await bundle("schema/index.ts")
const sets = await bundle("sets/index.ts")
const type = await bundle("type/index.ts")

console.log(describe("@ark/schema", schema))
console.log(describe("arksets", sets))
console.log(describe("arktype", type))
console.log()

const breaches = algebraMarkers.filter(marker => schema.includes(marker))

if (breaches.length) {
	throw new Error(
		`⚠️  @ark/schema bundle includes set algebra:\n${breaches.map(marker => `  ${marker}`).join("\n")}`
	)
}

console.log("🪶 @ark/schema bundles without set algebra!")
