import { attest } from "@arktype/attest"
import { node, type Node, type RootKind } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"
import { parseSchema, type RootNode } from "../node.js"
import type { Disjoint } from "../shared/disjoint.js"

describe("intersections", () => {
	it("root type assignment", () => {
		const t = node({ basis: "string", pattern: "/.*/" })
		attest<RootNode<"intersection", string>>(t)
		attest(t.json).snap({ basis: "string", pattern: [".*"] })
		// previously had issues with a union complexity error when assigning to Root | undefined
		const root: Node<RootKind> | undefined = node({
			basis: "string",
			pattern: "/.*/"
		})
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
		// TODO: should boundKind be here? How to instantiate refinements?
		attest(result.json).snap({
			basis: "number",
			divisor: 15,
			min: { min: 5, boundKind: "number" }
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
			union: ["string", "number"],
			ordered: true
		})
		const r = node({
			union: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})
	it("orthogonal refinements intersect as null", () => {
		const l = parseSchema("divisor", 5)
		const r = parseSchema("max", 100)
		const result = l.intersect(r)
	})
	it("possibly disjoint refinements", () => {
		const l = parseSchema("min", 2)
		const r = parseSchema("max", 1)
		const lrResult = l.intersect(r)
		attest<Disjoint | null>(lrResult).snap()
		const rlResult = r.intersect(l)
		attest<Disjoint | null>(rlResult).snap()
	})
	it("doesn't equate optional and required props", () => {
		const l = parseSchema("required", { key: "a", value: "number" })
		const r = parseSchema("optional", { key: "a", value: "number" })
		attest(l.equals(r)).equals(false)
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
