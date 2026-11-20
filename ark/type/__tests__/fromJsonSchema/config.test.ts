import { attest, contextualize } from "@ark/attest"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

// configure() must run before any Type exists, so it runs in a process of its
// own, which reads schemas as a program configured this way would
const readConfigured = (): unknown => {
	const program = `
import { configure } from "arktype/config"
configure({
	onUndeclaredKey: "reject",
	exactOptionalPropertyTypes: false,
	numberAllowsNaN: true,
	numberAllowsInfinity: true
})
const { fromJsonSchema, type } = await import("arktype")
const schema = { type: "object", properties: { a: { type: "number" } } }
const read = {
	fromJsonSchema: fromJsonSchema(schema),
	and: fromJsonSchema(schema).and(
		fromJsonSchema({ type: "object", properties: { b: { type: "number" } } })
	)
}
const allows = T => ({
	expression: T.expression,
	extraKey: T.allows({ a: 1, c: 1 }),
	undefinedValue: T.allows({ a: undefined }),
	nan: T.allows({ a: NaN }),
	infinity: T.allows({ a: Infinity })
})
console.log(JSON.stringify({
	...Object.fromEntries(Object.entries(read).map(([k, T]) => [k, allows(T)])),
	arktype: allows(type({ "a?": "number" }))
}))
`
	const result = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "--input-type=module", "-e", program],
		{ cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" }
	)
	if (result.status !== 0) throw new Error(result.stderr)
	return JSON.parse(result.stdout)
}

contextualize(() => {
	it("reads a JSON Schema the same under any configure()", () => {
		// an arktype Type follows the config, and a JSON Schema JSON Schema's defaults
		attest(readConfigured()).snap({
			fromJsonSchema: {
				expression: "{ a?: number, + (undeclared): ignore } & isNonArray",
				extraKey: true,
				undefinedValue: false,
				nan: false,
				infinity: false
			},
			and: {
				expression:
					"{ a?: number, b?: number, + (undeclared): ignore } & isNonArray",
				extraKey: true,
				undefinedValue: false,
				nan: false,
				infinity: false
			},
			arktype: {
				expression:
					"{ a?: (number | NaN | Infinity | -Infinity) | undefined, + (undeclared): reject }",
				extraKey: false,
				undefinedValue: true,
				nan: true,
				infinity: true
			}
		})
	})
})
