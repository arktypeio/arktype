// How each scale measurement bundles a synthetic app: as bundle.ts bundles the
// homepage's apps (esbuild, tree-shaken and minified, the "production"
// condition), with each library's plugin.
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
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

/**
 * What a bundle's entry is. "app" is the app modulesOf writes, whose one
 * export runs a handler for each schema, so a bundle holds what an app's
 * does: nothing outside it can read a schema, and each library ships only
 * what its handlers use. "exports" is every schema exported and nothing run,
 * as a package of schemas is bundled: whoever imports it may read any member
 * of any of them, so a precompiled build keeps them all, and a library whose
 * schemas have no methods also exports the functions that do what a
 * validator's do, as bundle.ts sizes it.
 */
export type ScaleEntry = "app" | "exports"

const libraryOf = (build: ScaleBuild) =>
	build === "default" || build === "smallest" || build === "dynamic" ?
		"arktype"
	:	build

const exportsOf = (build: ScaleBuild) =>
	`export * from "./${libraryOf(build)}.ts"${
		build in usageEntries ?
			`\n${usageEntries[build as keyof typeof usageEntries]}`
		:	""
	}`

/**
 * The minified bundle of the app synthOf wrote to `dir`. It throws where the
 * build couldn't prune a precompiled app by usage, as it then keeps every
 * member of every validator, which is several times the size of what an app
 * ships: at Node's default heap, the worker reading the bundle runs out of
 * memory on a default build of about 4,750 schemas with messages and narrows.
 * An app's bundle also throws where the build kept a member only because it
 * couldn't follow a schema to what reads it, as that app isn't the closed one
 * it's meant to measure.
 */
export const bundleOf = async (
	dir: string,
	library: ScaleBuild,
	entry: ScaleEntry
): Promise<string> => {
	const { outputFiles, warnings } = await build({
		...(entry === "app" ?
			{ entryPoints: [join(dir, libraryOf(library), "app.ts")] }
		:	{
				stdin: {
					contents: exportsOf(library),
					resolveDir: dir,
					loader: "ts"
				}
			}),
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
	const unpruned = warnings.find(
		({ text }) =>
			text.startsWith("prune: off") ||
			(entry === "app" && text.startsWith("prune: keeping"))
	)
	if (unpruned) throw new Error(`${library} build of ${dir}: ${unpruned.text}`)
	return outputFiles[0].text
}
