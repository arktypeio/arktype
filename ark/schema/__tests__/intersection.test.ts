import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"
import { parseSchema, type RootNode } from "../node.js"
import type { Disjoint } from "../shared/disjoint.js"

describe("intersections", () => {
	it("parse pattern", () => {
		const t = node({ basis: "string", pattern: ".*" })
		attest<RootNode<"intersection", string>>(t)
		attest(t.json).snap({ basis: "string", pattern: [".*"] })
	})
	it("multiple constraints", () => {
		const l = node({
			basis: "number",
			divisor: 3,
			min: 5
		})
		const r = node({
			basis: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest(result.json).snap({
			basis: "number",
			divisor: 15,
			min: 5
		})
	})
	it("union", () => {
		const l = node(
			{
				basis: "number",
				divisor: 2
			},
			{
				basis: "number",
				divisor: 3
			}
		)
		const r = node({
			basis: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest(result.json).snap([
			{ basis: "number", divisor: 10 },
			{ basis: "number", divisor: 15 }
		])
	})
	it("in/out", () => {
		const parseNumber = node({
			in: {
				basis: "string",
				pattern: wellFormedNumberMatcher,
				description: "a well-formed numeric string"
			},
			morph: (s: string) => parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			basis: "string",
			pattern: ["^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"],
			description: "a well-formed numeric string"
		})
		attest(parseNumber.out.json).snap({})
	})
	it("reduces union", () => {
		const n = node("number", {}, { is: 5 })
		attest(n.json).snap({})
	})
	it("in/out union", () => {
		const n = node(
			{
				in: "string",
				morph: (s: string) => parseFloat(s)
			},
			"number"
		)
		attest(n.in.json).snap(["number", "string"])
		attest(n.out.json).snap({})
	})
	it("errors on unknown key", () => {
		// @ts-expect-error
		attest(() => node({ foo: "bar", description: "baz" }))
			.throws.snap("Error: Key foo is not valid on intersection schema")
			.type.errors.snap("Type 'string' is not assignable to type 'never'.")
	})
	it("union of all types reduced to unknown", () => {
		const n = node(
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ is: true },
			{ is: false },
			{ is: null },
			{ is: undefined }
		)
		attest(n.json).snap({})
	})
	it("normalizes refinement order", () => {
		const l = node({
			basis: "number",
			divisor: 3,
			min: 5
		})
		const r = node({
			basis: "number",
			min: 5,
			divisor: 3
		})
		attest(l.id).equals(r.id)
	})
	it("normalizes prop order", () => {
		const l = node({
			basis: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = node({
			basis: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.id).equals(r.id)
	})
	it("normalizes union order", () => {
		const l = node("number", "string")
		const r = node("string", "number")
		attest(l.id).equals(r.id)
	})
	it("doesn't normalize ordered unions", () => {
		const l = node({
			branches: ["string", "number"],
			ordered: true
		})
		const r = node({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})
	it("orthogonal refinements intersect as null", () => {
		const l = parseSchema("divisor", 5)
		const r = parseSchema("max", 100)
		const result = l.intersect(r)
		attest<null>(result).equals(null)
	})
	it("possibly disjoint refinements", () => {
		const l = parseSchema("min", 2)
		const r = parseSchema("max", 1)
		const lrResult = l.intersect(r)
		attest<Disjoint | null>(lrResult)
		const rlResult = r.intersect(l)
		attest<Disjoint | null>(rlResult)
	})
	it("doesn't equate optional and required props", () => {
		const l = parseSchema("required", { key: "a", value: "number" })
		const r = parseSchema("optional", { key: "a", value: "number" })
		attest(l.equals(r)).equals(false)
	})
	it("compiles allows", () => {
		const n = node({
			basis: "number",
			divisor: 3,
			min: 5
		})
		attest(n.allows(6)).snap(true)
		attest(n.allows(7)).snap(false)
	})
	it("compiles problems", () => {
		const n = node({
			basis: "number",
			divisor: 3,
			min: 5
		})
		attest(n.traverse(6)).snap({ data: 6 })
		attest(n.traverse(7)).snap({
			problems: [{ path: [], message: "Must be a multiple of 3 (was 7)" }]
		})
	})
	it("compiles path problems", () => {
		const n = node({
			basis: "object",
			required: {
				key: "a",
				value: {
					basis: "number",
					divisor: 3,
					min: 5
				}
			}
		})
		attest(n.traverse({ a: 6 })).snap({ data: { a: 6 } })
		attest(n.traverse({ b: 6 })).snap({
			problems: [{ path: ["a"], message: "Must be provided" }]
		})
		attest(n.traverse({ a: 7 })).snap({
			problems: [{ path: ["a"], message: "Must be a multiple of 3 (was 7)" }]
		})
	})
	it("runtime benchmark", () => {
		const validInput = {
			number: 1,
			negNumber: -1,
			maxNumber: Number.MAX_VALUE,
			string: "string",
			longString:
				"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
			boolean: true,
			deeplyNested: {
				foo: "bar",
				num: 1,
				bool: false
			}
		}

		const invalidInput = {
			number: 1,
			negNumber: -1,
			maxNumber: Number.MAX_VALUE,
			string: "string",
			longString:
				"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
			boolean: true,
			deeplyNested: {
				foo: "bar",
				num: 1,
				bool: 5
			}
		}

		const arkType = node({
			basis: "object",
			required: [
				{ key: "number", value: "number" },
				{ key: "negNumber", value: "number" },
				{ key: "maxNumber", value: "number" },
				{ key: "string", value: "string" },
				{ key: "longString", value: "string" },
				{ key: "boolean", value: [{ is: true }, { is: false }] },
				{
					key: "deeplyNested",
					value: {
						basis: "object",
						required: [
							{ key: "foo", value: "string" },
							{ key: "num", value: "number" },
							{ key: "bool", value: [{ is: true }, { is: false }] }
						]
					}
				}
			]
		})
		attest(arkType.allows(validInput)).equals(true)
		attest(arkType.allows(invalidInput)).equals(false)
	})
	// TODO:
	// it("strict intersection", () => {
	// 	const T = type(
	// 		{
	// 			a: "number",
	// 			b: "number"
	// 		},
	// 		{ keys: "strict" }
	// 	)
	// 	const U = type(
	// 		{
	// 			a: "number"
	// 		},
	// 		{ keys: "strict" }
	// 	)

	// 	const i = intersection(T, U)
	// 	//  const i: Type<{ a: number; b: number;}>
	// })
})
