// moltar's arktype cases over each build: b1 and b2 from build.ts, dynamic on
// this repo's arktype and 2.2.9 from v2/ (npm i --prefix v2). Each runs the
// calls of the clone's arktype-(precompiled) case.
const { join } = require("node:path")

const { createCase } = require(join(process.argv[2], "benchmarks"))

type Validator = ((data: unknown) => unknown) & {
	allows: (data: unknown) => boolean
	assert: (data: unknown) => unknown
}

type Types = { t: Validator; tSafe: Validator; tStrict: Validator }

const dynamicOf = (arktype: { type: (def: object) => any }): Types => {
	const t = arktype.type({
		number: "number",
		negNumber: "number",
		maxNumber: "number",
		string: "string",
		longString: "string",
		boolean: "boolean",
		deeplyNested: { foo: "string", num: "number", bool: "boolean" }
	})
	return {
		t,
		tSafe: t.onDeepUndeclaredKey("delete"),
		tStrict: t.onDeepUndeclaredKey("reject")
	}
}

const register = (name: string, { t, tSafe, tStrict }: Types) => {
	createCase(name, "parseSafe", () => (data: unknown) => tSafe.assert(data))
	createCase(name, "parseStrict", () => (data: unknown) => tStrict.assert(data))
	createCase(name, "assertLoose", () => (data: unknown) => {
		if (t.allows(data)) return true
		throw new Error("Invalid")
	})
	createCase(name, "assertStrict", () => (data: unknown) => {
		if (tStrict.allows(data)) return true
		throw new Error("Invalid")
	})
}

// only the arm a process measures is loaded, so no build shares its process
const arm = process.argv[4]
if (arm === "arktype-b1" || arm === "arktype-b2")
	register(arm, require(join(__dirname, "..", "out", `${arm.slice(8)}.cjs`)))
else if (arm === "arktype-dynamic") register(arm, dynamicOf(require("arktype")))
else if (arm === "arktype-2.2.9")
	register(
		arm,
		dynamicOf(require(join(__dirname, "../v2/node_modules/arktype")))
	)
