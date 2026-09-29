// The suite runs on sources, so this checks what only bundling the built
// packages (ark/repo/bundle.ts) could break. arktype/config is imported first,
// as documented, so if it loaded its own copy of the registry, the one arktype
// loads would install as $ark2.
import "arktype/config"
import { scope, type } from "arktype"
import { readdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

console.log(
	"📦 Checking that each built package's entries share one set of modules...\n"
)

if ("$ark2" in globalThis) {
	throw new Error(
		"⚠️  arktype/config and arktype installed separate registries."
	)
}

const fromBuild = path => import(new URL(`../${path}`, import.meta.url).href)

const schema = await fromBuild("schema/out/index.js")

for (const entry of ["config", "runtime"]) {
	for (const [name, value] of Object.entries(
		await fromBuild(`schema/out/${entry}.js`)
	)) {
		if (value !== schema[name])
			throw new Error(`⚠️  @ark/schema/${entry} has its own copy of ${name}.`)
	}
}

if (
	(await import("arktype/internal/keywords/string.ts")) !==
	(await import("arktype"))
)
	throw new Error("⚠️  arktype/internal/* loads modules arktype does not.")

// configuring through a deep import must run before the rest of the package
// evaluates, as it does through ./config
const resolve = createRequire(
	new URL("../type/package.json", import.meta.url)
).resolve

for (const pkg of ["arktype", "@ark/schema"]) {
	for (const path of ["internal/config.ts", "internal/config.js"]) {
		if (resolve(`${pkg}/${path}`) !== resolve(`${pkg}/config`))
			throw new Error(`⚠️  ${pkg}/${path} loads more than ${pkg}/config.`)
	}
}

const errors = type("string")(5)

if (
	errors.constructor.name !== "ArkErrors" ||
	errors[0].constructor.name !== "ArkError" ||
	schema.Disjoint.name !== "Disjoint" ||
	scope({}).constructor.name !== "InternalScope"
)
	throw new Error("⚠️  Bundling renamed a class.")

// keepNames would name each of those classes in a static block, syntax that
// needs Safari 16.4, newer than anything else shipped
for (const pkg of ["util", "schema", "sets", "regex", "type"]) {
	const dir = new URL(`../${pkg}/out/`, import.meta.url)
	for (const name of readdirSync(dir).filter(name => name.endsWith(".js"))) {
		const visit = node => {
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

console.log("🧩 Every entry shares its package's modules and names!")
