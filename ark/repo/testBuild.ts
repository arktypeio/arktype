import { readdirSync, readFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"
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
	const internalNames = exportedNamesOf(resolve(`${name}/internal`))
	for (const module of modulesOf(pkg)) {
		await importBuilt(`${name}/internal/${module}.ts`)
		await importBuilt(`${name}/internal/${module}.js`)
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

const errors = type("string")(5)

if (
	errors.constructor.name !== "ArkErrors" ||
	errors[0].constructor.name !== "ArkError" ||
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

console.log("🧩 Every entry shares its package's modules and registry!")
