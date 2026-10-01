import { readdirSync, readFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const loaded = new Set<string>()

registerHooks({
	resolve: (specifier, context, nextResolve) => {
		const resolution = nextResolve(specifier, context)
		loaded.add(resolution.url)
		return resolution
	}
})

// imported first, as documented, so a second registry would install as $ark2
await import("arktype/config")
const { scope, type }: typeof import("arktype") = await import("arktype")

console.log(
	"📦 Checking that each built package's entries share one set of modules...\n"
)

if ("$ark2" in globalThis) {
	throw new Error(
		"⚠️  arktype/config and arktype installed separate registries."
	)
}

const packages = {
	util: "@ark/util",
	schema: "@ark/schema",
	sets: "arksets",
	regex: "arkregex",
	type: "arktype"
}

const fromPackage = (pkg: string, path = "") =>
	new URL(`../${pkg}/${path}`, import.meta.url)

const resolve = createRequire(fromPackage("type", "package.json")).resolve

const fromBuild = (path: string): Promise<Record<string, unknown>> =>
	import(pathToFileURL(resolve(path)).href)

const entryFiles = (pkg: string) =>
	Object.entries<string | { default: string }>(
		JSON.parse(readFileSync(fromPackage(pkg, "package.json"), "utf8")).exports
	).flatMap(([subpath, target]) => {
		const file = typeof target === "string" ? target : target.default
		return (
				!subpath.includes("*") &&
					!subpath.startsWith("./internal/") &&
					file.endsWith(".js")
			) ?
				[file.slice("./out/".length)]
			:	[]
	})

for (const pkg of Object.keys(packages)) {
	for (const file of entryFiles(pkg))
		await import(fromPackage(pkg, `out/${file}`).href)
}

for (const url of loaded) {
	for (const pkg of Object.keys(packages)) {
		const out = fromPackage(pkg, "out/").href
		if (!url.startsWith(out)) continue
		const file = url.slice(out.length)
		if (!entryFiles(pkg).includes(file) && !/^chunk-\w+\.js$/.test(file))
			throw new Error(`⚠️  Importing ${pkg}'s entries loads out/${file}.`)
	}
}

const schema = await fromBuild("@ark/schema")

for (const [name, value] of Object.entries(
	await fromBuild("@ark/schema/config")
)) {
	if (value !== schema[name])
		throw new Error(`⚠️  @ark/schema/config has its own copy of ${name}.`)
}

// configuring through a deep import must run before the package evaluates
for (const pkg of ["arktype", "@ark/schema"]) {
	for (const path of ["internal/config.ts", "internal/config.js"]) {
		if (resolve(`${pkg}/${path}`) !== resolve(`${pkg}/config`))
			throw new Error(`⚠️  ${pkg}/${path} loads more than ${pkg}/config.`)
	}
}

const stringKeywords = await fromBuild("arktype/internal/keywords/string.ts")
const tsKeywords = await fromBuild("arktype/internal/keywords/ts.ts")

if (
	!("parse" in (stringKeywords.json as object)) ||
	!("stringify" in (tsKeywords.json as object))
) {
	throw new Error(
		"⚠️  A deep import of arktype's keywords gets the other json."
	)
}

if ("$ark2" in globalThis)
	throw new Error("⚠️  A deep import installed a registry of its own.")

const errors = type("string")(5)

if (
	errors.constructor.name !== "ArkErrors" ||
	errors[0].constructor.name !== "ArkError" ||
	(schema.Disjoint as Function).name !== "Disjoint" ||
	scope({}).constructor.name !== "InternalScope"
)
	throw new Error("⚠️  Bundling renamed a class.")

// class static blocks need Safari 16.4, newer than anything else shipped
for (const pkg of Object.keys(packages)) {
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
