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

// imported first, as documented, so a second registry would install as $ark2
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

// a consumer's `export *` of arktype and another package drops any name both export
if ("string" in (await importBuilt("arktype")))
	throw new Error("⚠️  arktype's root exports its modules' names.")

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

// class static blocks need Safari 16.4, newer than anything else shipped
for (const pkg of packages) {
	const dir = fromPackage(pkg, "out/")
	for (const name of readdirSync(dir).filter(name => name.endsWith(".js"))) {
		const visit = (node: ts.Node): void => {
			if (ts.isClassStaticBlockDeclaration(node))
				throw new Error(`⚠️  ${pkg}/out/${name} has a class static block.`)
			ts.forEachChild(node, visit)
		}
		visit(
			ts.createSourceFile(
				name,
				readFileSync(new URL(name, dir), "utf8"),
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.JS
			)
		)
	}
}

console.log("🧩 Every entry shares its package's modules and registry!")
