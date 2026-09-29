// The suite runs on sources, so this checks what only bundling the built
// packages (ark/repo/bundle.ts) could break. arktype/config is imported first,
// as documented, so if it loaded its own copy of the registry, the one arktype
// loads would install as $ark2.
import "arktype/config"
import { type } from "arktype"

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

const errors = type("string")(5)

if (
	errors.constructor.name !== "ArkErrors" ||
	errors[0].constructor.name !== "ArkError"
)
	throw new Error("⚠️  Bundling renamed a class.")

console.log("🧩 Every entry shares its package's modules and names!")
