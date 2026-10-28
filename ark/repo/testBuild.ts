import type { ArkErrors } from "arktype"
import { build, buildSync } from "esbuild"
import { spawnSync } from "node:child_process"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import { ts } from "ts-morph"
import { publicEntryPoints } from "./bundle.ts"

const loadedUrls = new Set<string>()

registerHooks({
	resolve: (specifier, context, nextResolve) => {
		const resolution = nextResolve(specifier, context)
		loadedUrls.add(resolution.url)
		return resolution
	}
})

// imported first as documented, making any second registry install as $ark2
await import("arktype/config")
const { scope, type } = await import("arktype")

console.log(
	"📦 Checking that each built package's entries share one set of modules...\n"
)

if ("$ark2" in globalThis) {
	throw new Error(
		"⚠️  arktype/config and arktype installed separate registries."
	)
}

const packages = ["util", "schema", "sets", "regex", "type"]

const fromPackage = (pkg: string, path = "") =>
	new URL(`../${pkg}/${path}`, import.meta.url)

const resolve = createRequire(fromPackage("type", "package.json")).resolve

const importBuilt = (path: string): Promise<Record<string, unknown>> =>
	import(pathToFileURL(resolve(path)).href)

const entryUrls = (pkg: string) =>
	publicEntryPoints(fileURLToPath(fromPackage(pkg))).map(
		path => pathToFileURL(path).href
	)

for (const url of packages.flatMap(entryUrls)) await import(url)

for (const url of loadedUrls) {
	for (const pkg of packages) {
		const out = fromPackage(pkg, "out/").href
		if (!url.startsWith(out)) continue
		const file = url.slice(out.length)
		if (!entryUrls(pkg).includes(url) && !/^chunk-\w+\.js$/.test(file))
			throw new Error(`⚠️  Importing ${pkg}'s entries loads out/${file}.`)
	}
}

const arkSchema = await importBuilt("@ark/schema")

for (const [name, value] of Object.entries(
	await importBuilt("@ark/schema/config")
)) {
	if (value !== arkSchema[name])
		throw new Error(`⚠️  @ark/schema/config has its own copy of ${name}.`)
}

// configuring through a deep import must run before the package evaluates
for (const pkg of ["arktype", "@ark/schema"]) {
	for (const path of ["internal/config.ts", "internal/config.js"]) {
		if (resolve(`${pkg}/${path}`) !== resolve(`${pkg}/config`))
			throw new Error(`⚠️  ${pkg}/${path} loads more than ${pkg}/config.`)
	}
}

const stringKeywords = await importBuilt("arktype/internal/keywords/string.ts")
const tsKeywords = await importBuilt("arktype/internal/keywords/ts.ts")

if (
	!("parse" in (stringKeywords.json as object)) ||
	!("stringify" in (tsKeywords.json as object))
) {
	throw new Error(
		"⚠️  A deep import of arktype's keywords gets the other json."
	)
}

const modulesOf = (pkg: string) =>
	readdirSync(fromPackage(pkg, "out"), { recursive: true, encoding: "utf8" })
		.filter(path => path.endsWith(".d.ts"))
		.map(path => path.slice(0, -".d.ts".length).replace(/\\/g, "/"))

const program = ts.createProgram(
	packages.flatMap(pkg =>
		modulesOf(pkg).map(module =>
			fileURLToPath(fromPackage(pkg, `out/${module}.d.ts`))
		)
	),
	{ module: ts.ModuleKind.NodeNext, types: [] }
)

const checker = program.getTypeChecker()

const exportedNamesOf = (path: string) =>
	new Set(
		checker
			.getExportsOfModule(
				checker.getSymbolAtLocation(
					program.getSourceFile(path.replace(/js$/, "d.ts"))!
				)!
			)
			.map(symbol => symbol.name)
	)

for (const pkg of packages) {
	const { name } = JSON.parse(
		readFileSync(fromPackage(pkg, "package.json"), "utf8")
	)
	const internalPath = resolve(`${name}/internal`)
	for (const path of ["internal/index.ts", "internal/index.js"]) {
		if (resolve(`${name}/${path}`) !== internalPath)
			throw new Error(`⚠️  ${name}/${path} isn't ${name}/internal.`)
	}
	const internalNames = exportedNamesOf(internalPath)
	for (const module of modulesOf(pkg)) {
		// these also export @ark/schema's runtime, which internal can't
		if (
			name === "arktype" &&
			(module === "runtime" ||
				module === "runtimeDevelopment" ||
				module === "runtimeExports" ||
				module === "checkers")
		)
			continue
		for (const exportedName of exportedNamesOf(
			fileURLToPath(fromPackage(pkg, `out/${module}.js`))
		)) {
			if (!internalNames.has(exportedName)) {
				throw new Error(
					`⚠️  ${name}/internal lacks ${module}'s ${exportedName}.`
				)
			}
		}
	}
	// a consumer's `export *` of a package and another drops any name both export
	const rootNames = exportedNamesOf(resolve(name))
	for (const exportedName of Object.keys(await importBuilt(name))) {
		if (!rootNames.has(exportedName))
			throw new Error(`⚠️  ${name}'s root exports ${exportedName}.`)
	}
}

if ("$ark2" in globalThis)
	throw new Error("⚠️  A deep import installed a registry of its own.")

const runtimeNames = Object.keys(
	await importBuilt("@ark/schema/runtime")
).join()

// what errors "none" and builds writing errors for size load in place of
// @ark/schema/runtime
const runtimeVariant = async (variant: string) => {
	const runtime = await importBuilt(`@ark/schema/runtime/${variant}`)
	if (Object.keys(runtime).join() !== runtimeNames) {
		throw new Error(
			`⚠️  @ark/schema/runtime/${variant} exports other names than @ark/schema/runtime.`
		)
	}
	return (runtime.ArkErrors as Function).prototype
}

if ("_at" in (await runtimeVariant("none")))
	throw new Error("⚠️  @ark/schema/runtime/none bundles shared/issues.ts.")

for (const variant of ["lean", "none-lean"]) {
	// only the errors they replace have an arkKind
	if (Object.getOwnPropertySymbols(await runtimeVariant(variant)).length) {
		throw new Error(
			`⚠️  @ark/schema/runtime/${variant} bundles the errors it replaces.`
		)
	}
}

const errors = type("string")(5) as ArkErrors

if (
	errors.constructor.name !== "ArkErrors" ||
	(arkSchema.Disjoint as Function).name !== "Disjoint" ||
	scope({}).constructor.name !== "InternalScope"
)
	throw new Error("⚠️  Bundling renamed a class.")

const algebraMarkers = [
	"The intersection of two ordered unions is indeterminate",
	"An unordered union of a type including a morph",
	// written only by JSON Schema generation, which ships with the algebra
	"$defs"
]

const schemaOut = fromPackage("schema", "out/")

for (const name of readdirSync(schemaOut)) {
	if (!name.endsWith(".js")) continue
	const js = readFileSync(new URL(name, schemaOut), "utf8")
	for (const marker of algebraMarkers) {
		if (js.includes(marker)) {
			throw new Error(
				`⚠️  @ark/schema's out/${name} includes set algebra: ${marker}`
			)
		}
	}
}

// what arktype/runtime can't drop ships in every artifact
const runtimeBundle = buildSync({
	stdin: {
		contents: `export { Validator } from "arktype/runtime"`,
		resolveDir: fileURLToPath(fromPackage("type")),
		loader: "js"
	},
	bundle: true,
	format: "esm",
	platform: "neutral",
	write: false
}).outputFiles[0].text

for (const marker of ["__export(", "initialRegistryContents"]) {
	if (runtimeBundle.includes(marker))
		throw new Error(`⚠️  Bundling arktype/runtime keeps ${marker}.`)
}

const undetailed = fileURLToPath(new URL("temp/undetailed/", import.meta.url))
mkdirSync(undetailed, { recursive: true })

const { precompile } = await import("@ark/aot/unplugin")

// what a program logs, built with errors "none"
const undetailedLogsOf = async (
	file: string,
	program: string,
	conditions?: string[]
) => {
	writeFileSync(`${undetailed}${file}`, program)
	const { outputFiles } = await build({
		entryPoints: [`${undetailed}${file}`],
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		logLevel: "silent",
		...(conditions && { conditions }),
		plugins: [precompile.esbuild({ cwd: undetailed, errors: "none" })]
	})
	return spawnSync(process.execPath, ["--input-type=module"], {
		input: outputFiles![0].text,
		encoding: "utf8"
	}).stdout
}

// errors "none" runs on it as published, where errors have no throw()
const undetailedOutput = await undetailedLogsOf(
	"main.ts",
	`import { type } from "arktype"

const T = type({ a: "string" })
const errors = T({ a: 1 })
console.log(errors instanceof type.errors, String(errors), typeof (errors as any).throw)
try {
	T.assert({ a: 1 })
} catch (e) {
	console.log(String(e), (e as any).cause instanceof type.errors)
}
`
)

if (
	undetailedOutput !== "true is invalid undefined\nError: is invalid true\n"
) {
	throw new Error(
		`⚠️  A program built with errors: "none" logs ${JSON.stringify(undetailedOutput)}.`
	)
}

// a development build loads the runtime as published, beside what it adds
const inspectedOutput = await undetailedLogsOf(
	"inspected.ts",
	`import { type } from "arktype"\n\nconsole.log(type({ a: "string" })({ a: 1 }))\n`,
	["development"]
)

if (
	inspectedOutput.replace(/\s+/g, " ") !==
	"[ { code: 'predicate', path: [], data: { a: 1 }, message: 'is invalid' } ] "
) {
	throw new Error(
		`⚠️  A development build logs its errors as ${JSON.stringify(inspectedOutput)}.`
	)
}

// a precompiled program imports a few runtime exports, which bundlers
// tree-shake from the build's chunks. A statement the minifier can't prove
// free of side effects (a template over a module binding, `new RegExp`, a
// member read of a global) keeps all it reaches in every program importing
// anything from its chunk, which the source build (ark-ts, where a const
// folds) never shows. Each export is bundled alone both ways, with the
// build allowed the `var` declarations a chunk lowers consts to
const runtimeExports = await importBuilt("arktype/runtime")

const bundledLengthOf = async (name: string, conditions: string[]) => {
	const { outputFiles } = await build({
		stdin: {
			contents: `export { ${name} } from "arktype/runtime"`,
			resolveDir: fileURLToPath(fromPackage("repo")),
			loader: "ts"
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		conditions,
		write: false,
		logLevel: "error"
	})
	return outputFiles[0].text.length
}

for (const name of Object.keys(runtimeExports)) {
	const [built, source] = await Promise.all([
		bundledLengthOf(name, ["production"]),
		bundledLengthOf(name, ["ark-ts", "production"])
	])
	if (built > source * 1.25 + 32) {
		throw new Error(
			`⚠️  arktype/runtime's ${name} bundles to ${built} B from the build and ${source} B from source, so a statement in its chunk reads as a side effect.`
		)
	}
}

console.log("🧩 Every entry shares its package's modules and registry!")
