// The suite runs on sources, so this checks what only bundling the built
// packages (ark/repo/bundle.ts) could break. arktype/config is imported first,
// as documented, so if it loaded its own copy of the registry, the one arktype
// loads would install as $ark2.
import "arktype/config"
import { type } from "arktype"
import { createRequire } from "node:module"

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
	errors[0].constructor.name !== "ArkError"
)
	throw new Error("⚠️  Bundling renamed a class.")

console.log("🧩 Every entry shares its package's modules and names!")
