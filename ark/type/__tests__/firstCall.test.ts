import { attest } from "@ark/attest"
import { ArkErrors, type, type Traversal, type Type } from "arktype"

type Log = unknown[]

const observe = (log: Log, name: string, ctx: Traversal, value: unknown) =>
	log.push([
		name,
		[...ctx.path],
		ctx.propString,
		ctx.data,
		ctx.root,
		value,
		ctx.errors.constructor.name
	])

const isValid = (value: unknown) => value !== "bad"

const narrow = (log: Log, name: string) => (value: unknown, ctx: Traversal) => {
	observe(log, name, ctx, value)
	return isValid(value) || ctx.mustBe("valid")
}

const morph = (log: Log, name: string) => (value: unknown, ctx: Traversal) => {
	observe(log, name, ctx, value)
	return typeof value === "string" ? `${value}!` : value
}

const narrowed = (log: Log, name = "n") =>
	type("string").narrow(narrow(log, name))

const morphed = (log: Log, name = "m") => type("string").pipe(morph(log, name))

// each builds from new callbacks, so no two calls share a node or its compiled code
const cases: {
	[name: string]: [make: (log: Log) => Type<any>, data: () => unknown[]]
} = {
	"an array's elements": [
		log => narrowed(log).array(),
		() => [["a", "b"], ["a", "bad"], [1]]
	],
	"an element's prop": [
		log => type({ a: narrowed(log) }).array(),
		() => [[{ a: "a" }], [{ a: "bad" }, { a: 1 }]]
	],
	"a tuple's elements": [
		log =>
			type([
				narrowed(log, "first"),
				[type("number").narrow(narrow(log, "second")), "?"]
			] as never),
		() => [["a"], ["bad"], ["a", 1], ["a", "x"]]
	],
	"a variadic tuple's elements": [
		log =>
			type([
				narrowed(log, "head"),
				"...",
				type("number").narrow(narrow(log, "rest")).array(),
				narrowed(log, "tail")
			] as never),
		() => [
			["a", "b"],
			["a", 1, 2, "b"],
			["bad", 0, "bad"]
		]
	],
	"a union's discriminated branches": [
		log =>
			type({ v: narrowed(log, "a"), z: "'a'" }).or({
				v: narrowed(log, "b"),
				z: "'b'"
			}),
		() => [
			{ z: "a", v: "x" },
			{ z: "b", v: "x" },
			{ z: "b", v: "bad" },
			{ z: "c", v: "x" }
		]
	],
	"a key beside a morph": [
		log =>
			type({
				a: { b: morphed(log).array() },
				c: narrowed(log)
			}),
		() => [
			{ a: { b: ["x"] }, c: "c" },
			{ a: { b: ["x", 1] }, c: "bad" }
		]
	],
	"a key under one deleting undeclared keys": [
		log =>
			type({
				outer: { "+": "delete", v: narrowed(log) },
				other: "number"
			}),
		() => [
			{ outer: { v: "a", extra: 1 }, other: 1 },
			{ outer: { v: "a", extra: 1 }, other: "x" },
			{ outer: { v: "bad" }, other: 1 }
		]
	],
	"a cycle": [
		log => type({ v: narrowed(log), "next?": "this" }),
		() => [
			{ v: "a", next: { v: "b" } },
			{ v: "a", next: { v: "bad" } },
			{ v: "a", next: 1 }
		]
	],
	"an array of a cycle": [
		log => {
			const Node = type({ v: narrowed(log), "next?": "this" })
			return type({ head: Node, "tail?": Node.array() })
		},
		() => [{ head: { v: "a" }, tail: [{ v: "b", next: { v: "bad" } }] }]
	]
}

const summaryOf = (out: unknown) =>
	out instanceof ArkErrors ? out.summary : out

const called = (
	make: (log: Log) => Type<any>,
	data: unknown,
	calls: number
) => {
	const log: Log = []
	const T = make(log) as (data: unknown) => unknown
	// the first call runs uncompiled, the second compiled
	for (let i = 0; i < calls; i++) T(0)
	log.length = 0
	return { result: summaryOf(T(data)), log }
}

describe("a Type's first call", () => {
	for (const [name, [make, data]] of Object.entries(cases)) {
		it(`passes its callbacks what a compiled call does: ${name}`, () => {
			for (let i = 0; i < data().length; i++)
				attest(called(make, data()[i], 0)).equals(called(make, data()[i], 2))
		})
	}

	it("no compiled code is built for a Type whose narrows read ctx until its second call", () => {
		const T = type({ a: narrowed([]) })
		attest(T({ a: "a" })).equals({ a: "a" })
		attest(T.internal.unitFn).equals(undefined)
		attest(T({ a: "a" })).equals({ a: "a" })
		attest(typeof T.internal.unitFn).equals("function")
	})
})
