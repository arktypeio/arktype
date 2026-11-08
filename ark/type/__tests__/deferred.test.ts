import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { IntersectionNode, UnionNode, UnitNode } from "@ark/schema"
import { hasOwn } from "@ark/util"
import { type } from "arktype"
import { domainsOf, unitBitsOf } from "arksets/internal"
import { keywordDomains } from "arktype/internal/deferred.ts"
import { spawnSync } from "node:child_process"

const isUnread = (t: object) => !hasOwn(t, "kind")

const anyType: any = type

const messageOf = (define: () => unknown): string | undefined => {
	try {
		define()
	} catch (e) {
		return (e as Error).message
	}
}

// what a file importing arktype prints, where nothing has fixed its config
const printed = (body: string) =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--input-type=module",
			"-e",
			`import { configure, type } from "arktype"\n${body}`
		],
		{ cwd: fromHere(".."), encoding: "utf8" }
	).stdout

contextualize(() => {
	it("a keyword is what it's said to be", () => {
		for (const [def, domain] of Object.entries(keywordDomains)) {
			const t = type.raw(def)
			const bits = domainsOf(t.internal)
			attest([
				def,
				t.internal.alters,
				(bits & unitBitsOf(domain!)) === bits
			]).equals([def, false, true])
		}
	})

	it("builds nothing until it's read", () => {
		const t = type({ a: "string", "b?": "number[] > 1" })
		attest(isUnread(t)).equals(true)
		attest(t.expression).snap("{ a: string, b?: number[] >= 2 }")
		attest(isUnread(t)).equals(false)
		attest(t.internal.kind as string).equals("intersection")
	})

	it("asking its kind's class is a read", () => {
		const t = type({ asked: "string" })
		attest(isUnread(t)).equals(true)
		attest(t instanceof UnionNode).equals(false)
		attest(isUnread(t)).equals(false)
		attest(t instanceof IntersectionNode).equals(true)
		attest(type({ asked2: "string" }) instanceof IntersectionNode).equals(true)
		attest(type("string.ip") instanceof UnionNode).equals(true)
		attest(type("'asked3'") instanceof UnitNode).equals(true)
		attest({} instanceof UnitNode).equals(false)
		attest((() => {}) instanceof UnitNode).equals(false)
	})

	it("a call is a read", () => {
		const t = type({ called: "string" })
		attest(isUnread(t)).equals(true)
		attest(t({ called: "" })).snap({ called: "" })
		attest(t({}).toString()).snap("called must be a string (was missing)")
		attest(t.expression).snap("{ called: string }")
	})

	it("throws at its call what parsing it throws", () => {
		const defs = [
			"strin",
			"5 < string < 3",
			"-1 <= number < -1",
			"string[] < -1",
			"string < 1.5",
			"'a' = 'b'",
			"string & number",
			"string > 3 & string < 2",
			"string & /(/",
			"Record<string, strin>",
			{ a: "strin" },
			{ a: "string = 5" },
			{ a: ["string", "=", 5] },
			{ "a?": "string = 'x'" },
			{ a: "string", "a?": "string" },
			{ "+": "bad", a: "string" },
			{
				"...": type.raw({ "[string]": "string" }),
				a: "number"
			},
			{ a: { b: { c: "strin" } } }
		]
		for (const def of defs) {
			const message = messageOf(() => type.raw(def))
			attest([def, typeof message]).equals([def, "string"])
			attest(messageOf(() => anyType(def))).equals(message)
		}
	})

	it("what holds an alias throws where it's composed", () => {
		const cyclic = type
			.raw({
				"[string]": "boolean",
				a: "this | 1 <= number.integer <= 5 = 3"
			})
			.or("number.safe")
		attest(() =>
			anyType({ z: [cyclic, "=", () => 1] }).narrow(() => true)
		).throws("results in an unsatisfiable type")
	})

	it("a narrow checks a unit it holds at its call", () => {
		const rejected: unknown[] = []
		const rejects = (value: unknown) => {
			rejected.push(value)
			return false
		}
		attest(() => type("'narrowed'").narrow(rejects)).throws("unsatisfiable")
		attest(rejected.includes("narrowed")).equals(true)
		const defs = [
			type("'keptA' | null").describe("described"),
			type({ held: "string" }).or("'keptB'").describe("described")
		]
		for (const t of defs) {
			rejected.length = 0
			messageOf(() => (t as any).narrow(rejects))
			attest(rejected.length > 0).equals(true)
		}
	})

	it("a union with a unit calls what it narrows at its call", () => {
		const seen: unknown[] = []
		const narrowed = type("string").narrow(s => {
			seen.push(s)
			return true
		})
		attest(isUnread(narrowed.or("'seen'"))).equals(false)
		attest(seen).equals(["seen"])
	})

	it("throws at a chained call", () => {
		const longer = (s: string) => s.length > 3
		const chains: (() => unknown)[] = [
			() => type("string").narrow(longer).default("x"),
			() => type("string > 3").default("x"),
			() => type("string >= 3").atMostLength(1),
			() => (type("string") as any).atLeast(1),
			() => (type("number") as any).atLeastLength(1),
			() => type("number >= 3").atMost(1),
			() => type("number < -1").atLeast(-1),
			() =>
				(
					type({ a: "string.trim" })
						.array()
						.narrow(() => true) as any
				).atMostLength(1),
			() => type("string.trim").or("string.trim |> string > 1"),
			() => type({ a: "string" }).and({ a: "number" }),
			() => type({ a: "string.trim" }).or({ a: "string" })
		]
		for (const chain of chains) {
			attest(typeof messageOf(chain)).equals("string")
			// the same definition, already read
			const again = messageOf(chain)
			attest(again).equals(messageOf(chain))
		}
	})

	it("config it can't prove anything under parses at the call", () => {
		attest(
			printed(`configure({ onUndeclaredKey: "delete" })
const t = type({ a: "string" })
console.log(Object.hasOwn(t, "kind"), t({ a: "", b: "" }))`)
		).snap("true { a: '' }\n")
		attest(
			printed(`configure({ exactOptionalPropertyTypes: false })
const t = type({ "a?": "string" })
console.log(Object.hasOwn(t, "kind"), t({ a: undefined }))`)
		).snap("false { a: undefined }\n")
	})

	it("a definition fixes config before it's read", () => {
		attest(
			printed(`type("string")
try {
	configure({ onUndeclaredKey: "reject" })
	console.log("configured")
} catch (e) {
	console.log(e.message.slice(0, 19))
}`)
		).snap("configure() must be\n")
	})

	it("an optional prop holding an alias throws at its call where undefined composes it", () => {
		attest(
			printed(`configure({ exactOptionalPropertyTypes: false })
const X = type.or({ b: "true" }, ["this", "[]"]).onUndeclaredKey("delete")
for (const def of [{ "z?": X }, { z: [X, "=", () => []] }]) {
	try {
		type(def)
	} catch (e) {
		console.log(e.message.slice(0, 30))
	}
}`)
		).snap("An unordered union of a type i\nAn unordered union of a type i\n")
	})

	// as written here, each is what parsing the pair gives where nothing read either first
	it("equal definitions are one Type, as their nodes make them", () => {
		const same: [unknown, unknown][] = [
			["'a' | 'b'", "'b' | 'a'"],
			["string > 0", "string >= 1"],
			["string >= 0", "string"],
			["string[] >= 1", "string[] > 0"],
			["(string)[]", "string[]"],
			[{ a: ["string", "=", "x"] }, { a: "string = 'x'" }],
			[{ "a?": "string" }, { a: ["string", "?"] }],
			[{ a: { b: "string" } }, { a: { b: "string" } }],
			[
				{ "+": "reject", a: "string" },
				{ a: "string", "+": "reject" }
			],
			[/a/, "/a/"]
		]
		for (const [l, r] of same)
			attest([l, r, anyType(l) === anyType(r)]).equals([l, r, true])
		const apart: [unknown, unknown][] = [
			["true | false", "boolean"],
			["null | null", "null"],
			[{ a: "string" }, { "a?": "string" }],
			[{ a: "string = 'x'" }, { a: "string = 'y'" }],
			[{ "a,1b": "string" }, { a: "string", b: "string" }],
			[
				{ a: "string", b: "string" },
				{ b: "string", a: "string" }
			],
			["number > 1", "number >= 2"],
			["number.integer > 1", "number.integer >= 2"],
			["number >= 0", "number"],
			["'1'", "true"]
		]
		for (const [l, r] of apart)
			attest([l, r, anyType(l) === anyType(r)]).equals([l, r, false])
	})

	it("a chain is one Type with what it writes", () => {
		attest(
			printed(`const longer = s => s.length > 3
const t = type({ d: "number" })
console.log(
	type("'c'[]") === type("'c'").array(),
	type("string >= 7") === type("string").atLeastLength(7),
	type("7 <= string <= 9") === type("string").atMostLength(9).atLeastLength(7),
	type("number >= 7") === type("number").atLeast(7),
	type("string").narrow(longer) === type("string").narrow(longer),
	type({ a: "string", b: "number" }) === type({ a: "string" }).and({ b: "number" }),
	type({ c: type("'c'") }) === type({ c: "'c'" }),
	type(t) === t,
	Object.hasOwn(t, "kind")
)`)
		).snap("true true true true true true true true false\n")
	})

	it("a string is the node another route reached once nodes exist", () => {
		const read = type("'read'")
		attest(read.expression).snap('"read"')
		const eager = anyType(["'reached'", "[]"])
		attest(type("'reached'[]")).is(eager)
		attest(isUnread(eager)).equals(false)
	})

	it("what holds a function keeps deferring what it's chained to", () => {
		const read = type({ chained: "string" })
		attest(read.expression).snap("{ chained: string }")
		const t = read.narrow(() => true)
		attest(isUnread(t)).equals(true)
	})

	it("a chain from what's read keeps deferring", () => {
		const read = type({ chain: "'read'" })
		attest(read.expression).snap('{ chain: "read" }')
		attest(isUnread(read.array())).equals(true)
	})

	it("a spread holds only the props it doesn't replace", () => {
		const spread = () =>
			type({
				"...": type({ a: ["string", "=", () => ""], b: "number" }),
				a: "string"
			})
		const t = spread()
		attest(isUnread(t)).equals(true)
		attest(spread()).is(t)
		attest(t.expression).snap("{ a: string, b: number }")
	})

	it("exclude of a literal union is the union of what's left", () => {
		attest(
			printed(`const left = type("'a' | 'b' | 'c'").exclude("'a'")
console.log(Object.hasOwn(left, "kind"), left === type("'b' | 'c'"))
console.log(type("'a' | 'b'").exclude("'b'") === type("'a'"))`)
		).snap("false true\ntrue\n")
	})

	it("a unit is the literal that writes it", () => {
		const parsed = printed(`console.log(
	type.unit("a") === type("'a'"),
	type.unit(1) === type("1"),
	type.enumerated("a", 1) === type("1 | 'a'"),
	type.unit(-0).expression,
	type.unit(NaN).expression,
	type.unit("it's").expression,
	type.enumerated("a", "a").expression,
	type.enumerated().expression
)`)
		attest(parsed).snap(`true true true 0 NaN "it's" "a" never
`)
	})

	it("a number literal is one it writes exactly", () => {
		for (const bad of ["1.50", "01", "-0", "1e3"]) {
			const message = messageOf(() => anyType(bad))
			attest(message).equals(messageOf(() => type.raw(bad)))
			attest(typeof message).equals("string")
		}
		attest(isUnread(type({ literal: "1.5" }))).equals(true)
	})

	it("a brand is what it's of", () => {
		attest(
			printed(
				`console.log(type("string#a") === type("string"), type("number#b!c") === type.number)`
			)
		).snap("true true\n")
		attest(isUnread(type({ branded: "string#a" }))).equals(true)
	})

	it("configure defers only meta that can't throw", () => {
		const base = type({ configured: "string" })
		const t = base.configure({ expected: "e" })
		attest(isUnread(t)).equals(true)
		attest(t).is(base.configure({ expected: "e" }))
		attest(t({ configured: 1 }).toString()).equals(
			"configured must be a string (was a number)"
		)
		attest(t(1).toString()).equals("must be e (was a number)")
		attest(isUnread(base.configure({ description: "d" }, "self"))).equals(false)
	})

	it("Record defers what it can't reject", () => {
		attest(
			printed(`const t = type.Record("string.uuid", "number")
console.log(Object.hasOwn(t, "kind"), t.internal.kind)
console.log(type.Record("string", "number") === type("Record<string, number>"))
console.log(type.Record.params.length)`)
		).snap("false intersection\ntrue\n2\n")
		attest(messageOf(() => anyType.Record("number", "number"))).snap(
			"K must be assignable to string | symbol (was number)"
		)
		attest(messageOf(() => anyType.Record("'a'", "number"))).snap(
			'Index keys "a" should be specified as named props.'
		)
	})

	it("this is its own in each definition", () => {
		const def = { boxed: "this[]", "seen?": "this" } as never
		const t = anyType(def)
		attest(isUnread(t)).equals(true)
		attest(t === anyType(def)).equals(false)
		attest(t.expression).snap("{ boxed: this[], seen?: this }")
		attest(isUnread(t.array().atLeastLength(1))).equals(true)
	})

	it("to a string from a trim defers", () => {
		attest(
			printed(`const t = type("string.trim").to("string <= 1")
console.log(Object.hasOwn(t, "kind"), t === type("string.trim").to("string <= 1"))`)
		).snap("false true\n")
		attest(messageOf(() => type("string.trim").to("number"))).equals(
			messageOf(() => type("string.trim |> number"))
		)
	})

	it("pipe.try is on a Type that's unread", () => {
		const t = type("'tried'").pipe.try(s => JSON.parse(s))
		attest(t("tried").toString()).snap(
			`must be valid according to an anonymous predicate (was aborted due to error:
    SyntaxError: Unexpected token 'i', "tried" is not valid JSON
)`
		)
	})

	it("a keyword's attachment is the Type its name defines", () => {
		attest(type.string).is(type("string") as never)
		attest(type.number).is(type("number") as never)
	})

	it("reads the same in either order", () => {
		const first = type({ order: "string" }).array()
		attest(first.expression).snap("{ order: string }[]")
		attest(type({ order: "string" }).array()).is(first)
	})

	it("a wider bound leaves the narrower", () => {
		attest(type("string >= 88").atLeastLength(1).expression).snap(
			"string >= 88"
		)
		attest(type("string <= 88").atMostLength(99).expression).snap(
			"string <= 88"
		)
		attest(type("number >= 88").atLeast(1).expression).snap("number >= 88")
	})

	it("holds a __proto__ key as its prop", () => {
		const def = JSON.parse(`{ "__proto__": "string" }`)
		attest(anyType(def).expression).equals(type.raw(def).expression)
	})

	it("a definition changed after its call isn't read", () => {
		const def = { late: "string" }
		const t = anyType(def)
		def.late = "number"
		attest(t.expression).snap("{ late: string }")
	})
})
