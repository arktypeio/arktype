import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import { run, runPlain, writeFixture } from "./utils.ts"

// Standard Schema's validate returns its result, so a precompiled validator's
// never calls the onFail configure() sets, as arktype's doesn't

const conditions = ["ark-ts", "production"]

const strategies: Record<string, PrecompileUnpluginOptions> = {
	production: {},
	smallest: { preset: "smallest" },
	size: { optimize: "size" },
	"module alone": { prune: false }
}

const main = `import "./config.ts"
import { type } from "arktype"

// read only by its Standard Schema, and as a whole
const Alone = type({ name: "string" })
const Called = type({ id: "number" })
const Piped = type("string").pipe(s => s.length)
const tell = (T: any, data: unknown) => {
	const result = T["~standard"].validate(data)
	console.log(JSON.stringify(result.issues?.map((issue: any) => issue.message) ?? result))
}
tell(Alone, { name: 5 })
tell(Alone, { name: "a" })
tell(Called, { id: "x" })
tell(Piped, 1)
tell(Piped, "abc")
try {
	console.log(JSON.stringify(Called({ id: "x" })))
} catch (e) {
	console.log((e as Error).name)
}
`

const bundle = async (
	root: string,
	opts: PrecompileUnpluginOptions,
	buildConditions = conditions
) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions: buildConditions,
		logLevel: "silent",
		plugins: [
			precompile.esbuild({
				cwd: root,
				conditions: buildConditions,
				config: "config.ts",
				...opts
			})
		]
	})
	return outputFiles![0].text
}

contextualize(function (this: Mocha.Suite) {
	this.timeout(600_000)

	it("reports each issue as expected to be valid, and as invalid, where errors is none", async () => {
		const root = writeFixture(
			{
				"package.json": `{"type":"module"}`,
				"config.ts": `import "arktype/errors"
import { configure } from "arktype/config"
configure({ errors: "none" })
`,
				"main.ts": `import "./config.ts"
import { type } from "arktype"
const T = type({ a: "string" })
const out = T({ a: 1 })
if (!(out instanceof type.errors)) throw new Error("expected errors")
const std = T["~standard"].validate({ a: 1 }) as { issues: readonly { expected?: unknown }[] }
console.log(JSON.stringify({
	summary: out.summary,
	summaryIn: out.summaryIn(),
	expected: out.issues[0].expected,
	message: out.issues[0].message,
	stdExpected: std.issues[0].expected,
	json: out.toJSON()
}))
`
			},
			fromHere("temp", "standardValidate", "errors-none")
		)
		// the runtime as published, so each of its error classes is the one built
		for (const optimizeErrors of ["speed", "size"] as const) {
			attest(
				JSON.parse(
					run(await bundle(root, { errors: "none", optimizeErrors }, []))
				)
			).snap({
				summary: "is invalid",
				summaryIn: "is invalid",
				expected: "valid",
				message: "is invalid",
				stdExpected: "valid",
				json: [
					{
						code: "predicate",
						path: [],
						expected: "valid",
						message: "is invalid"
					}
				]
			})
		}
	})

	for (const [name, onFail, expected] of [
		[
			"throwing",
			"errors => errors.throw()",
			`["must be a string"]
{"value":{"name":"a"}}
["must be a number"]
["must be a string"]
{"value":3}
TraversalError
`
		],
		[
			"returning another value",
			'() => "failed"',
			`["must be a string"]
{"value":{"name":"a"}}
["must be a number"]
["must be a string"]
{"value":3}
"failed"
`
		]
	] as const) {
		it(`validate returns issues under an onFail ${name}`, async () => {
			const root = writeFixture(
				{
					"config.ts": `import { configure } from "arktype/config"\n\nconfigure({ onFail: ${onFail} })\n`,
					"main.ts": main
				},
				fromHere("temp", "standardValidate", name.replace(/ /g, "-"))
			)
			attest(runPlain(root)).equals(expected)
			for (const strategy in strategies) {
				attest([
					strategy,
					run(await bundle(root, strategies[strategy]))
				]).equals([strategy, expected])
			}
		})
	}
})
