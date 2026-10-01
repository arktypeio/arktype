// The suite runs on sources, so this checks what only bundling the built
// packages (ark/repo/bundle.ts) could break. arktype/config is imported first,
// as documented, so if it loaded its own copy of the registry, the one arktype
// loads would install as $ark2.
import { readdirSync, readFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

// every file importing a package's entries loads
const loaded = new Set<string>()

registerHooks({
	resolve: (specifier, context, nextResolve) => {
		const resolution = nextResolve(specifier, context)
		loaded.add(resolution.url)
		return resolution
	}
})

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

// the outputs of each export without a * outside ./internal/, e.g. "index.js"
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

// importing an entry loads no module's own file
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

// configuring through a deep import must run before the rest of the package
// evaluates, as it does through ./config
for (const pkg of ["arktype", "@ark/schema"]) {
	for (const path of ["internal/config.ts", "internal/config.js"]) {
		if (resolve(`${pkg}/${path}`) !== resolve(`${pkg}/config`))
			throw new Error(`⚠️  ${pkg}/${path} loads more than ${pkg}/config.`)
	}
}

// each module of a package, as its path from the package's root without an
// extension, e.g. "keywords/string"
const modulesOf = (pkg: string) =>
	readdirSync(fromPackage(pkg, "out"), { recursive: true, encoding: "utf8" })
		.filter(path => path.endsWith(".d.ts"))
		.map(path => path.slice(0, -".d.ts".length).replace(/\\/g, "/"))

const sourceOf = (pkg: string, module: string) =>
	fileURLToPath(fromPackage(pkg, `${module}.ts`))

// the sources, independently of the JS bundle.ts read, name what each deep
// import should export
const program = ts.createProgram(
	Object.keys(packages).flatMap(pkg =>
		modulesOf(pkg).map(module => sourceOf(pkg, module))
	),
	{
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		customConditions: ["ark-ts"],
		allowImportingTsExtensions: true,
		noEmit: true,
		types: []
	}
)
const checker = program.getTypeChecker()

/**
 * the declaration of each value a module's source exports, by the name it
 * exports it as: not a type, nor declared `declare`, nor exported with
 * `export type`
 */
const valueExportsOf = (source: string): Map<string, ts.Declaration> =>
	new Map(
		checker
			.getExportsOfModule(
				checker.getSymbolAtLocation(program.getSourceFile(source)!)!
			)
			.flatMap(symbol => {
				if (symbol.declarations?.some(ts.isTypeOnlyImportOrExportDeclaration))
					return []
				const target =
					symbol.flags & ts.SymbolFlags.Alias ?
						checker.getAliasedSymbol(symbol)
					:	symbol
				if (!target.declarations?.length)
					throw new Error(`⚠️  ${source} exports ${symbol.name} unresolved.`)
				const declaration = target.declarations.find(
					declaration =>
						!ts.isInterfaceDeclaration(declaration) &&
						!ts.isTypeAliasDeclaration(declaration) &&
						!(
							ts.getCombinedModifierFlags(declaration) &
							ts.ModifierFlags.Ambient
						)
				)
				return target.flags & ts.SymbolFlags.Value && declaration ?
						[[symbol.name, declaration] as const]
					:	[]
			})
	)

let deepImports = 0

// A deep import may export names its module doesn't, but each name its module
// exports is the value the module's declaration of it evaluates to, the same
// through every deep import, and the root's if the root exports it
for (const [pkg, name] of Object.entries(packages)) {
	const root = await fromBuild(name)
	const rootValues = new Set(Object.values(root))
	const rootExports = valueExportsOf(sourceOf(pkg, "index"))
	const values = new Map<ts.Declaration, unknown>()
	const declarationsByName = new Map<string, Set<ts.Declaration>>()
	for (const module of modulesOf(pkg)) {
		const specifier = `${name}/internal/${module}.js`
		if (resolve(specifier) !== resolve(specifier.replace(/\.js$/, ".ts")))
			throw new Error(`⚠️  ${specifier} and its .ts resolve apart.`)
		const exports = await fromBuild(specifier)
		for (const [exported, declaration] of valueExportsOf(
			sourceOf(pkg, module)
		)) {
			if (!(exported in exports))
				throw new Error(`⚠️  ${specifier} doesn't export ${exported}.`)
			const value = exports[exported]
			if (!values.has(declaration)) values.set(declaration, value)
			else if (values.get(declaration) !== value)
				throw new Error(`⚠️  ${specifier} exports a copy of ${exported}.`)
			if (
				rootExports.get(exported) === declaration ?
					value !== root[exported]
				:	(typeof value === "object" || typeof value === "function") &&
					!rootValues.has(value)
			)
				throw new Error(`⚠️  ${specifier} exports a copy of ${exported}.`)
			declarationsByName.set(
				exported,
				(declarationsByName.get(exported) ?? new Set()).add(declaration)
			)
		}
		deepImports++
	}
	// a name modules declare apart is exported apart
	for (const [exported, declarations] of declarationsByName) {
		const distinct = new Set([...declarations].map(d => values.get(d)))
		if (distinct.size !== declarations.size)
			throw new Error(`⚠️  ${name}'s modules share one ${exported}.`)
	}
	// with the value of all but the first under an alias
	const aliases = Object.keys(root).filter(
		exported => !declarationsByName.has(exported)
	)
	const aliased = [...declarationsByName.values()].reduce(
		(count, declarations) => count + declarations.size - 1,
		0
	)
	if (aliases.length !== aliased) {
		throw new Error(
			`⚠️  ${name} exports ${aliases.join(", ") || "no aliases"} for ${aliased} names its modules declare apart.`
		)
	}
}

// the one name two modules declare apart
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

// keepNames would name each of those classes in a static block, syntax that
// needs Safari 16.4, newer than anything else shipped, and wraps functions in
// __name calls, which bundling drops wherever the language names the function
// alike
for (const pkg of Object.keys(packages)) {
	const dir = fromPackage(pkg, "out/")
	for (const name of readdirSync(dir).filter(name => name.endsWith(".js"))) {
		const visit = (node: ts.Node): void => {
			if (ts.isClassStaticBlockDeclaration(node))
				throw new Error(`⚠️  ${pkg}/out/${name} has a class static block.`)
			if (ts.isIdentifier(node) && node.text === "__name")
				throw new Error(`⚠️  ${pkg}/out/${name} names a function with __name.`)
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

console.log(
	`🧩 Every entry shares its package's modules and names, and each of ${deepImports} deep imports exports its module's values!`
)
