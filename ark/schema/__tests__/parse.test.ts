import { attest, contextualize } from "@ark/attest"
import {
	parseAsSchema,
	registerNodeId,
	rootSchema,
	schemaScope,
	writeInvalidSchemaMessage
} from "@ark/schema"
import { ParseError } from "@ark/util"

contextualize(() => {
	it("unique ids for digit-ending prefixes", () => {
		const ids = new Set<string>()
		for (let i = 0; i < 12; i++) ids.add(registerNodeId("unique1"))
		for (let i = 0; i < 2; i++) ids.add(registerNodeId("unique11"))

		attest(ids.size).equals(14)
	})

	it("invalid schema", () => {
		attest(() => rootSchema(5 as never)).throws(writeInvalidSchemaMessage(5))
		attest(() => rootSchema({ foo: 1 } as never)).throws(
			writeInvalidSchemaMessage({ foo: 1 })
		)
		attest(parseAsSchema(5)).instanceOf(ParseError)
	})

	it("structure keys both flattened and nested", () => {
		attest(() =>
			rootSchema({
				domain: "object",
				structure: {},
				required: [{ key: "a", value: "string" }]
			} as never)
		).throws.snap(
			"ParseError: Flattened structure key required cannot be specified alongside a root 'structure' key."
		)
	})

	it("single constraint", () => {
		const T = rootSchema({ domain: "string", pattern: ".*" })
		attest(T.json).snap({ domain: "string", pattern: [".*"] })
	})

	it("multiple constraints", () => {
		const L = rootSchema({
			domain: "number",
			divisor: 3,
			min: 5
		})
		const R = rootSchema({
			domain: "number",
			divisor: 5
		})
		const T = L.and(R)

		attest(T.json).snap({
			domain: "number",
			divisor: 15,
			min: 5
		})
	})

	it("array union element from json", () => {
		const T = rootSchema({ proto: Array, sequence: ["string", "number"] })
		attest(T.expression).snap("(number | string)[]")
		attest(T.json).snap({ sequence: ["number", "string"], proto: "Array" })
		attest(rootSchema(T.json as never).equals(T)).equals(true)
	})

	it("variadic element with minVariadicLength", () => {
		const T = schemaScope({}).schema({
			proto: Array,
			sequence: { variadic: "number", minVariadicLength: 1 }
		})
		attest(T.allows([1])).equals(true)
		attest(T.allows([])).equals(false)
		attest(() =>
			rootSchema({
				proto: Array,
				sequence: { prefix: ["number"], minVariadicLength: 1 }
			} as never)
		).throws.snap(
			"ParseError: minVariadicLength may not be specified without a variadic element"
		)
	})

	it("throws on reduced minLength disjoint", () => {
		attest(() =>
			rootSchema({
				proto: Array,
				maxLength: 0,
				sequence: {
					prefix: ["number"],
					variadic: "number"
				}
			})
		).throws.snap(
			"ParseError: Intersection of == 0 and >= 1 results in an unsatisfiable type"
		)
	})
})
