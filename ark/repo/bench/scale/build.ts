// How each scale measurement bundles a synthetic app: as bundle.ts bundles the
// homepage's apps (esbuild, tree-shaken and minified, the "production"
// condition), with each library's entry and plugin.
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { usageEntries } from "../bundle.ts"

/**
 * ArkType precompiled with the default options ("default") and with
 * preset: "smallest", ArkType creating its Types at runtime ("dynamic"), and
 * the libraries synth.ts also writes an app in
 */
export const scaleBuilds = [
	"default",
	"smallest",
	"dynamic",
	"valibot",
	"zod",
	"zodMini"
] as const

export type ScaleBuild = (typeof scaleBuilds)[number]

const isArktype = (library: ScaleBuild) =>
	library === "default" || library === "smallest" || library === "dynamic"

// a library whose schemas have no methods also exports the functions that do
// what a validator's do, as bundle.ts sizes it
const entryOf = (library: ScaleBuild) =>
	isArktype(library) ? `export * from "./arktype.ts"`
	: library in usageEntries ?
		`export * from "./${library}.ts"\n${usageEntries[library as keyof typeof usageEntries]}`
	:	`export * from "./${library}.ts"`

/**
 * The minified bundle of the app synthOf wrote to `dir`. It throws where the
 * build couldn't prune a precompiled app by usage, as it then keeps every
 * member of every validator, which is several times the size of what an app
 * ships: at Node's default heap, the worker reading the bundle runs out of
 * memory on a default build of about 4,750 schemas with messages and narrows.
 */
export const bundleOf = async (
	dir: string,
	library: ScaleBuild
): Promise<string> => {
	const { outputFiles, warnings } = await build({
		stdin: {
			contents: entryOf(library),
			resolveDir: dir,
			loader: "ts"
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		write: false,
		logLevel: "error",
		conditions: ["production"],
		plugins:
			library === "default" ? [precompile.esbuild({ cwd: dir })]
			: library === "smallest" ?
				[precompile.esbuild({ cwd: dir, preset: "smallest" })]
			:	[]
	})
	const unpruned = warnings.find(({ text }) => text.startsWith("prune: off"))
	if (unpruned) throw new Error(`${library} build of ${dir}: ${unpruned.text}`)
	return outputFiles[0].text
}
