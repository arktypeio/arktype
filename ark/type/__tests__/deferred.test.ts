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

// a RegExp that isn't written as what it matches
class Keyword extends RegExp {
	override toString(): string {
		return "string"
	}
}

const messageOf = (define: () => unknown): string | undefined => {
	try {
		define()
	} catch (e) {
		return (e as Error).message
	}
}

// what a file importing arktype prints, where nothing has fixed its config
const printed = (body: string) => {
	const result = spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--input-type=module",
			"-e",
			`import { configure, type } from "arktype"\n${body}`
		],
		{ cwd: fromHere(".."), encoding: "utf8" }
	)
	if (result.status !== 0)
		throw new Error(result.stderr || `Subprocess exited with ${result.status}`)
	return result.stdout
}

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

	it("a range that ends below zero builds nothing until it's read", () => {
		const t = type({ below: "number <= -1", under: "number.integer < -3" })
		attest(isUnread(t)).equals(true)
		attest(t.expression).snap("{ below: number <= -1, under: number % 1 < -3 }")
		attest(t.allows({ below: -1, under: -4 })).equals(true)
		attest(t.allows({ below: 0, under: -4 })).equals(false)
		attest(t.allows({ below: -1, under: -3 })).equals(false)
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
			{ a: "3 <= string > 3[] <= 5" },
			"string < 1.5",
			"'a' = 'b'",
			"string & number",
			"string > 3 & string < 2",
			"string & /(/",
			"Record<string, strin>",
			{ a: "strin" },
			{ a: "string = 5" },
			// more digits than a number holds, so another number than written
			{ a: "number = 9007199254740993" },
			{ a: "number < 9007199254740993" },
			{ a: "9007199254740993 < number < 9007199254740995" },
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
				"[string]": "string",
				a: "this | string.numeric.parse"
			})
			.or("number.safe")
		attest(() =>
			anyType({ z: [cyclic, "=", () => 1] }).narrow(() => true)
		).throws("results in an unsatisfiable type")
	})

	it("a Record of a literal holding an alias throws where it's composed", () => {
		// its conflict is thrown the first time each is composed
		const cyclic = () =>
			type
				.raw({
					"[string]": "string",
					a: "this | string.numeric.parse"
				})
				.or("number.safe")
		const held = anyType.Record("string", { z: cyclic() })
		attest(isUnread(held)).equals(true)
		attest(() => held.narrow(() => true)).throws(
			"results in an unsatisfiable type"
		)
		attest(() =>
			anyType.Record("string", [{ z: cyclic() }, "[]"]).narrow(() => true)
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
			type({ held: "string" }).or("'keptB'").describe("described"),
			type.or("5 <= number <= 5", "string")
		]
		for (const t of defs) {
			rejected.length = 0
			messageOf(() => (t as any).narrow(rejects))
			attest(rejected.length > 0).equals(true)
		}
	})

	it("a number bounded to one value is the unit a narrow checks", () => {
		attest(
			printed(`const seen = []
const sees = n => (seen.push(n), true)
const range = type("5 <= number <= 5")
const bounded = type("number.integer >= 1")
const narrowed = type("number >= 2").narrow(sees)
const length = type("3 <= string <= 3").narrow(sees)
range.narrow(sees)
bounded.atMost(1).narrow(sees)
narrowed.atMost(2)
console.log(seen.join(), Object.hasOwn(length, "kind"))
const t = type({ limit: "0 <= number <= 0 = 0" })
console.log(Object.hasOwn(t, "kind"), t({}).limit)`)
		).snap("5,1,2 false\nfalse 0\n")
	})

	it("a narrow of a morph checks a unit its output holds at its call", () => {
		attest(
			printed(`const seen = []
const sees = s => (seen.push(s), true)
const to = type("string.trim").to(type.or("'seen'", "string.date.iso"))
console.log(Object.hasOwn(to, "kind"), seen.length)
const narrowed = to.narrow(sees)
console.log(seen.join(), Object.hasOwn(type("string.trim").to("string.date.iso").narrow(sees), "kind"))`)
		).snap(`false 0
seen false
`)
	})

	it("a narrow of a union checks a unit a built morph outputs at its call", () => {
		const seen: unknown[] = []
		const sees = (value: unknown) => {
			seen.push(value)
			return true
		}
		const union = type.or("number[]", type.raw("string.trim").to("'a' | 'b'"))
		attest(isUnread(union)).equals(true)
		union.narrow(sees)
		attest(seen).equals(["a", "b"])
		const unitless = type.or(
			"number[]",
			type.raw("string.trim").to("string > 1")
		)
		attest(isUnread(unitless.narrow(sees))).equals(true)
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

	it("a union calls what a branch narrows on a unit another holds in its place, at its call", () => {
		const seen: unknown[] = []
		const sees = (data: unknown) => {
			seen.push(data)
			return true
		}
		const narrowed = () => type(/(?:)/).narrow(sees)
		const unions: (() => unknown)[] = [
			// a node says nothing of how it was written
			() => type.or(type.raw("string").narrow(sees), "'node'"),
			() => narrowed().and(/(?:)/).or("'and'"),
			() =>
				narrowed()
					.array()
					.or(type.unit(["element"])),
			() =>
				narrowed()
					.array()
					.atLeastLength(1)
					.or(type.unit(["bounded"])),
			() => type.Record("string", narrowed()).or(type.unit({ a: "record" })),
			() => type({ a: narrowed() }).or({ a: "'prop'" }),
			() => type({ a: { b: narrowed() } }).or({ a: { b: "'nested'" } }),
			// a discriminant read after the prop doesn't spare the call
			() => type({ a: narrowed(), z: "'l'" }).or({ a: "'tagged'", z: "'r'" }),
			() => type({ a: type.raw("string").narrow(sees) }).or({ a: "'held'" })
		]
		for (const union of unions) {
			seen.length = 0
			attest(isUnread(union() as object)).equals(false)
			attest(seen.length).equals(1)
		}
		seen.length = 0
		// neither a predicate of a prop nor one of the whole is called on another prop's unit
		const apart = [
			type({ kind: "'l'", a: narrowed() }).or({ kind: "'r'", b: "'unit'" }),
			type({ kind: "'l'", a: "string" })
				.narrow(sees)
				.or({ kind: "'r'", a: "'unit'" }),
			type({ a: narrowed() }).or({ b: "number" }).or({ c: "'unit'" })
		]
		for (const t of apart) attest(isUnread(t)).equals(true)
		attest(seen).equals([])
	})

	it("a union calls what a branch narrows on the one value its range and another's meet at, at its call", () => {
		const seen: unknown[] = []
		const sees = (data: unknown) => {
			seen.push(data)
			return true
		}
		// each from a number of its own, since a unit is asked of a predicate once
		const from = (n: number) => type.raw(`number >= ${n}`).narrow(sees)
		const unions: (() => unknown)[] = [
			() => type.or("number.integer >= 1", "number <= 1").narrow(sees),
			() => type.or(from(2), "number <= 2"),
			() =>
				type
					.or(type.or("number.integer >= 3", "string"), "number <= 3")
					.narrow(sees),
			() => type({ a: from(4) }).or({ a: "number <= 4" }),
			// a discriminant read after the prop doesn't spare the call
			() =>
				type({ a: { b: from(5) }, z: "'l'" }).or({
					a: { b: "number <= 5" },
					z: "'r'"
				}),
			() => type.or(from(6).array(), "(0 <= number <= 6)[]"),
			() =>
				type.or(
					type.raw("Date >= d'2000-01-01'").narrow(sees),
					type.raw("Date <= d'2000-01-01'")
				)
		]
		for (const union of unions) {
			seen.length = 0
			attest(isUnread(union() as object)).equals(false)
			attest(seen.length).equals(1)
		}
		seen.length = 0
		// ranges that overlap, stop short of each other or meet at what one excludes
		// allow no value alone
		const apart = [
			type.or(from(10), "number.integer >= 10"),
			type.or(from(12), "number <= 11"),
			type.or(type.raw("number > 13").narrow(sees), "number <= 13"),
			type({ kind: "'l'", n: type.raw("0 <= number <= 100").narrow(sees) }).or({
				kind: "'r'",
				n: "0 <= number <= 100"
			}),
			type.or(type.raw("string >= 2").narrow(sees), "string <= 2")
		]
		for (const t of apart) attest(isUnread(t)).equals(true)
		attest(seen).equals([])
	})

	it("a range narrowed before it's read says where it ends", () => {
		attest(
			printed(`const seen = []
const sees = n => (seen.push(n), true)
const narrowed = type("number >= 1").narrow(sees)
const bounded = type("number").narrow(sees).atLeast(2)
const elements = type("number >= 3").narrow(sees).array().atLeastLength(1)
const short = type("number >= 4").narrow(sees)
const unions = [
	narrowed.or("number <= 1"),
	bounded.or("number.integer <= 2"),
	elements.or("(number <= 3)[]"),
	short.or("number < 4")
]
console.log(seen.join(), unions.map(t => Object.hasOwn(t, "kind")).join())`)
		).snap(`1,2,3 true,true,true,false
`)
	})

	it("holding a built union calls nothing discriminating it would", () => {
		const seen: unknown[] = []
		const sees = (data: unknown) => {
			seen.push(data)
			return false
		}
		// its string case asks what's narrowed of each unit once it's first used
		const union = type.or(
			type.enumerated("a", "b").pipe(s => s),
			type("string").narrow(sees),
			{}
		)
		attest(isUnread(union)).equals(false)
		seen.length = 0
		const holding = [
			type({ held: union }),
			type.or({ held: union }, "false"),
			type.or(union.array(), "false"),
			type.Record("string", union)
		]
		for (const t of holding) attest(isUnread(t)).equals(true)
		attest(seen).equals([])
	})

	it("an optional prop that could be undefined calls what it narrows at its call", () => {
		attest(
			printed(`configure({ exactOptionalPropertyTypes: false })
const seen = []
const loose = type.raw("unknown").narrow(data => (seen.push(String(data)), true))
type({ "a?": loose })
console.log(seen.join())`)
		).snap("undefined\n")
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
			() => type.or("string <= 2", "string >= 5").and("3 <= string <= 4"),
			() =>
				type
					.or("string <= 2", "string >= 5")
					.describe("d")
					.and("3 <= string <= 4"),
			() =>
				type
					.or("string <= 2", "string >= 5")
					.narrow(() => true)
					.and("3 <= string <= 4"),
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

	it("an intersection with a union of strings is built at its call", () => {
		attest(isUnread(type.or("string <= 2", /b/).and(/c/))).equals(false)
		attest(isUnread(type(/a/).and("string <= 2").and(/c/))).equals(true)
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

	it("an optional prop holding an alias is built at its call where undefined composes it", () => {
		attest(
			printed(`configure({ exactOptionalPropertyTypes: false })
const X = type({ "next?": "this" }).onUndeclaredKey("delete")
for (const def of [{ "z?": X }, { z: [X, "=", () => ({})] }])
	console.log(Object.hasOwn(type(def), "kind"))`)
		).snap("true\ntrue\n")
	})

	it("a default of undefined throws at its call where a default replaces undefined", () => {
		attest(
			printed(`configure({ exactOptionalPropertyTypes: false })
for (const define of [
	() => type({ a: ["'x' | undefined", "=", undefined] }),
	() => type({ a: type("'x' | undefined").default(undefined) })
]) {
	try {
		define()
	} catch (e) {
		console.log(e.message)
	}
}`)
		).snap(`Default for a must be "x"
Default for a must be "x"
`)
		attest(anyType({ a: ["'x' | undefined", "=", undefined] })({})).equals({
			a: undefined
		})
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
			// a name starting with a digit isn't more of its length
			[
				{ "1a": "string", bbbbbbbbbb: "number" },
				{ "a:string,10bbbbbbbbbb": "number" }
			],
			[
				{ "1a": "string", bbbbbbbbbb: "number" },
				{ "a:string,10:bbbbbbbbbb": "number" }
			],
			[
				{ a: "string", b: "string" },
				{ b: "string", a: "string" }
			],
			["number > 1", "number >= 2"],
			["number.integer > 1", "number.integer >= 2"],
			["number >= 0", "number"],
			["'1'", "true"],
			// a string's regex is the source a / it escapes is bare in
			[{ a: /b\/c/ }, { a: "/b\\/c/" }],
			[{ a: "/b\rc/" }, { a: "/b\\rc/" }],
			[{ a: new Keyword("b") }, { a: "string" }]
		]
		for (const [l, r] of apart)
			attest([l, r, anyType(l) === anyType(r)]).equals([l, r, false])
	})

	it("a bound before an array of a range is that range's", () => {
		attest(
			printed(`const outer = type({ a: type("string < 5").array().atLeastLength(3).atMostLength(5) })
const parenthesized = type({ a: "3 <= (string < 5)[] <= 5" })
const inner = type({ a: "3 <= string < 5[] <= 5" })
console.log(outer === parenthesized, inner === outer, Object.hasOwn(parenthesized, "kind"))
console.log(inner.expression, outer.expression)`)
		).snap(
			"true false false\n{ a: (3 <= string <= 4)[] <= 5 } { a: 3 <= (string <= 4)[] <= 5 }\n"
		)
	})

	it("a bound with its own message isn't the Type its bound alone writes", () => {
		attest(
			printed(`const t = type("number").atLeast(7, "At least seven")
console.log(t === type("number >= 7"), String(t(1)), String(type("number >= 7")(1)))`)
		).snap("false At least seven must be at least 7\n")
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
			"configured must be a string"
		)
		attest(t(1).toString()).equals("must be e")
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
		// a literal key is a prop, which isn't deferred
		const literal = type.Record("'a'", "number")
		attest(isUnread(literal)).equals(false)
		attest(literal.expression).snap("{ a: number }")
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

	it("to a string that can't be scanned throws what parsing it throws", () => {
		attest(
			printed(`try {
	type("string.trim").to("string & /(/")
} catch (e) {
	console.log(e.constructor.name, e.message)
}`)
		)
			.snap(`ParseError SyntaxError: Invalid regular expression: /(/: Unterminated group
`)
	})

	it("pipe.try is on a Type that's unread", () => {
		const t = type("'tried'").pipe.try(s => JSON.parse(s))
		attest(t("tried").toString()).snap(
			"must be valid according to an anonymous predicate (SyntaxError: Unexpected token 'i', \"tried\" is not valid JSON)"
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

	it("a union nested in another is reduced as it's nested where their branches overlap", () => {
		const plain = type(/a/)
		const described = type(/a/).describe("x")
		const first = plain.or(described).or("string & /c/")
		const last = plain.or("string & /c/").or(described)
		attest(first === last).equals(false)
		// equal branches keep the meta of the one kept, however they're nested
		attest(first.json).snap([
			{ domain: "string", pattern: ["c"] },
			{
				domain: { domain: "string", meta: "x" },
				pattern: [{ rule: "a", meta: "x" }],
				meta: "x"
			}
		])
		attest(last.json).snap([
			{ domain: "string", pattern: ["c"] },
			{
				domain: { domain: "string", meta: "x" },
				pattern: [{ rule: "a", meta: "x" }],
				meta: "x"
			}
		])
		// branches nothing reduces are one union however it's nested
		attest(type.or("string", "number").or("boolean")).is(
			type.or("string", "number", "boolean")
		)
	})

	it("a description reaches a Type built to a node that already existed", () => {
		// a union that's only a string is the node `string` is, held as another object
		const twin = type.or("string", /a/)
		const described = twin.atLeastLength(2).or(/b/).describe("x")
		attest(described.json).snap({
			branches: [
				{
					domain: { domain: "string", meta: "x" },
					minLength: { rule: 2, meta: "x" },
					meta: "x"
				},
				{
					domain: { domain: "string", meta: "x" },
					pattern: [{ rule: "b", meta: "x" }],
					meta: "x"
				}
			],
			meta: "x"
		})
	})

	it("a definition changed after its call isn't read", () => {
		const def = { late: "string" }
		const t = anyType(def)
		def.late = "number"
		attest(t.expression).snap("{ late: string }")
	})

	it("exclude does not collide on boolean or settled unit terms", () => {
		attest(
			printed(`const u = type.unit(undefined)
void u.expression
const T = u.or("boolean").exclude("undefined")
console.log(T.allows(undefined), T.allows(true), T.allows(false))
const B = type("'a' | boolean").exclude("true")
console.log(B.allows(true), B.allows(false), B.allows("a"))
const S = type("'a' | null").exclude("null")
console.log(S === type("'a'"), S.allows("a"), S.allows(null))`)
		).snap("false true true\nfalse true true\ntrue true false\n")
	})

	it("Record snapshots mutable object value definitions", () => {
		attest(
			printed(`const def = { x: "string" }
const R1 = type.Record("string", def)
def.x = "number"
const R2 = type.Record("string", { x: "string" })
console.log(R1 === R2, R2.allows({ a: { x: "hi" } }), R2.allows({ a: { x: 42 } }))`)
		).snap("true true false\n")
	})

	it("configure snapshots mutable meta and rejects non-plain or symbol-keyed meta", () => {
		attest(
			printed(`const m = { description: "first" }
const A = type("string").configure(m)
m.description = "MUTATED"
const B = type("string").configure({ description: "first" })
console.log(A === B, A.description, B.description)
const sym = Symbol("k")
const C = type("string").configure({ title: "x" })
const D = type("string").configure({ title: "x", [sym]: 1 })
console.log(C === D, Object.hasOwn(D, "kind"))
for (const bad of [{ tit: "x" }, { e: "x" }, { "": "x" }]) {
	const E = type("string").configure(bad)
	console.log(Object.hasOwn(E, "kind"))
}`)
		).snap("true first first\nfalse true\ntrue\ntrue\ntrue\n")
	})

	it("throws eagerly on exclusive bound and non-finite numeric defaults", () => {
		const invalidDefs: [unknown, string][] = [
			[
				{ limit: "number > 0 = 0" },
				"ParseError: Default for limit must be positive"
			],
			[
				{ n: "number < 5 = 5" },
				"ParseError: Default for n must be less than 5"
			],
			[
				{ n: "0 < number < 5 = 0" },
				"ParseError: Default for n must be positive"
			],
			[
				{ n: "0 < number < 5 = 5" },
				"ParseError: Default for n must be less than 5"
			],
			[
				{ x: ["number", "=", Infinity] },
				"ParseError: Default for x must be a number"
			],
			[
				{ x: ["number", "=", -Infinity] },
				"ParseError: Default for x must be a number"
			]
		]
		for (const [def, expected] of invalidDefs) {
			attest(() => type.raw(def)).throws(expected)
			attest(() => anyType(def)).throws(expected)
		}
		attest(() => type("number > 0").default(0)).throws.snap(
			"ParseError: Default must be positive"
		)
		attest(() => type("number").default(Infinity)).throws.snap(
			"ParseError: Default must be a number"
		)
		// valid interior defaults still defer
		attest(isUnread(type({ valid: "0 < number < 5 = 3" }))).equals(true)
	})

	describe("a Type that's frozen", () => {
		const fixes: Record<string, (t: object) => unknown> = {
			freeze: Object.freeze,
			seal: Object.seal,
			preventExtensions: Object.preventExtensions
		}

		it("leaves a later equal definition a Type of its own", () => {
			for (const [name, fix] of Object.entries(fixes)) {
				const frozen: type.Any = anyType({ [name]: "string" })
				fix(frozen)
				const later: type.Any = anyType({ [name]: "string" })
				attest(later === frozen).equals(false)
				attest(Object.isExtensible(later)).equals(true)
				attest(later({ [name]: "a" })).equals({ [name]: "a" })
				attest(later({ [name]: 1 }).toString()).equals(
					`${name} must be a string`
				)
				// once the frozen one is read, the Type it built is what's defined
				attest(frozen.equals(later)).equals(true)
				attest(anyType({ [name]: "string" }) === later).equals(true)
			}
		})

		it("leaves a string defined after it a Type of its own", () => {
			attest(
				printed(`Object.freeze(type("string"))
const later = type("string")
console.log(Object.isExtensible(later), later("a"), later(1).toString(), later("b"))`)
			).snap(`true a must be a string b
`)
		})

		it("before it's read is called and read as what it built", () => {
			for (const [name, fix] of Object.entries(fixes)) {
				const key = `cold${name}`
				const t = anyType({ [key]: "string", "n?": "number.integer > 0" })
				fix(t)
				attest(isUnread(t)).equals(true)
				// uncompiled, then compiled
				for (let i = 0; i < 3; i++) {
					attest(t({ [key]: "a", n: 1 })).equals({ [key]: "a", n: 1 })
					attest(t({ [key]: "a", n: 0 }).toString()).equals(
						"n must be positive"
					)
					attest(t.allows({ [key]: "a" })).equals(true)
					attest(t.allows({ [key]: 1 })).equals(false)
				}
				attest(t.expression).equals(`{ ${key}: string, n?: number % 1 > 0 }`)
				attest(t.array().expression).equals(`${t.expression}[]`)
				attest(t.keyof().expression).equals(`"${key}" | "n"`)
				attest(t.assert({ [key]: "a" })).equals({ [key]: "a" })
				// a function's own keys, as an unread Type's are
				attest(Object.keys(t)).equals([])
				attest(isUnread(t)).equals(true)
				attest(messageOf(() => ((t as any).added = 1))).equals(
					"'set' on proxy: trap returned falsish for property 'added'"
				)
			}
		})

		it("before it's read is held as the Type it built", () => {
			const frozen = Object.freeze(type({ heldCold: "string.trim" }))
			const held = type({ held: frozen })
			const holders = [
				held,
				type.or(frozen, "undefined"),
				type({ box: "unknown" })
					.pipe(o => o.box)
					.to(frozen),
				type.Record("string", frozen)
			]
			for (const holder of holders) {
				attest(
					holder.internal.references.every(node => Object.isExtensible(node))
				).equals(true)
			}
			for (let i = 0; i < 3; i++) {
				attest(held({ held: { heldCold: " a " } })).equals({
					held: { heldCold: "a" }
				})
				attest(held({ held: { heldCold: 1 } }).toString()).equals(
					"held.heldCold must be a string"
				)
			}
		})

		it("after it's read checks as it did, cold and once it would compile", () => {
			const uses: Record<string, (t: type.Any) => void> = {
				read: t => void t.expression,
				called: t => void t({ warm: "a" }),
				compiled: t => {
					for (let i = 0; i < 3; i++) t.allows({ warm: "a" })
				}
			}
			for (const [name, use] of Object.entries(uses)) {
				const t = type({ warm: "string", [name]: "number = 1" })
				use(t)
				Object.freeze(t)
				for (let i = 0; i < 3; i++) {
					attest(t({ warm: "a" })).equals({ warm: "a", [name]: 1 })
					attest(t({ warm: 1 }).toString()).equals("warm must be a string")
					attest(t.allows({ warm: "a" })).equals(true)
					attest(t.allows({})).equals(false)
				}
				// what compiled before it was frozen is still what it checks with
				attest(t.precompilation !== undefined).equals(
					name === "compiled" && !t.internal.$.cfg.jitless
				)
				const again = type({ warm: "string", [name]: "number = 1" })
				attest(Object.isExtensible(again)).equals(true)
				attest(again({ warm: "a" })).equals({ warm: "a", [name]: 1 })
			}
		})

		it("derives what it's first asked for once it's frozen", () => {
			const union = type.or(
				{ kind: "'circle'", r: "number" },
				{ kind: "'square'", side: "number" },
				type("string.trim").to("string > 0")
			)
			void union.expression
			Object.freeze(union)
			for (let i = 0; i < 3; i++) {
				attest(union({ kind: "square", side: 1 })).equals({
					kind: "square",
					side: 1
				})
				attest(union(" a ")).equals("a")
				attest(union({ kind: "line" }).toString()).equals(
					'kind must be "circle" or "square"'
				)
			}
			attest(union["~standard"].validate(" b ")).equals({ value: "b" })
			const list = type({ next: "string", "rest?": "this" })
			void list.expression
			Object.freeze(list)
			attest(list({ next: "a", rest: { next: 1 } }).toString()).equals(
				"rest.next must be a string"
			)
			attest(list.keyof().expression).equals('"next" | "rest"')
		})

		it("is left unbound by what compiles holding it", () => {
			const frozen = type({ part: "string.trim" })
			void frozen.expression
			Object.freeze(frozen)
			// past where it would have compiled, so nothing says it's still to
			for (let i = 0; i < 3; i++)
				attest(frozen({ part: " c " })).equals({ part: "c" })
			// what's piped to it reads its traversals from it, so compiles them
			const piped = type({ box: "unknown" })
				.pipe(o => o.box)
				.to(frozen)
			for (let i = 0; i < 3; i++) {
				attest(piped({ box: { part: " a " } })).equals({ part: "a" })
				attest(piped({ box: { part: 1 } }).toString()).equals(
					"part must be a string"
				)
			}
			attest(piped.precompilation !== undefined).equals(
				!piped.internal.$.cfg.jitless
			)
			attest(frozen.precompilation).equals(undefined)
		})
	})

	describe("onUndeclaredKey cache isolation", () => {
		it("does not collide when loose union is created before strict union", () => {
			attest(
				printed(`const Loose = type({ a: "string" }).or({ b: "number" }).or("null")
const Strict = type({ a: "string" }).or({ b: "number" }).onUndeclaredKey("reject").or("null")
console.log(
	Loose === Strict,
	Loose.allows({ a: "x", z: 1 }),
	Strict.allows({ a: "x", z: 1 }),
	Strict.allows({ a: "x" }),
	Strict.allows(null)
)
console.log(Strict({ a: "x", z: 1 }).toString())`)
			).snap(
				"false true false true true\nz must be removed or b must be a number\n"
			)
		})

		it("does not collide when strict union is created before loose union", () => {
			attest(
				printed(`const Strict = type({ a: "string" }).or({ b: "number" }).onUndeclaredKey("reject").or("null")
const Loose = type({ a: "string" }).or({ b: "number" }).or("null")
console.log(
	Loose === Strict,
	Strict.allows({ a: "x", z: 1 }),
	Loose.allows({ a: "x", z: 1 }),
	JSON.stringify(Loose({ a: "x", z: 1 }))
)`)
			).snap('false false true {"a":"x","z":1}\n')
		})

		it("distinguishes whole-union and single-branch onUndeclaredKey in both orders", () => {
			for (const wholeFirst of [true, false]) {
				const out = printed(`const makeWhole = () =>
	type({ k: "'a'" }).or({ k: "'b'" }).onUndeclaredKey("reject")
const makeHalf = () =>
	type({ k: "'a'" }).or(type({ k: "'b'" }).onUndeclaredKey("reject"))
const Whole = ${wholeFirst ? "makeWhole()" : "makeHalf()"}
const Half = ${wholeFirst ? "makeHalf()" : "makeWhole()"}
const [W, H] = ${wholeFirst ? "[Whole, Half]" : "[Half, Whole]"}
console.log(
	W === H,
	W.allows({ k: "a", z: 1 }),
	H.allows({ k: "a", z: 1 }),
	H.allows({ k: "b", z: 1 })
)`)
				attest(out).equals("false false true false\n")
			}
		})

		it("distinguishes onUndeclaredKey('ignore') on a strict union in both orders", () => {
			for (const strictFirst of [true, false]) {
				const out = printed(`const makeStrict = () =>
	type({ k: "'a'", "+": "reject" }).or({ k: "'b'", "+": "reject" }).or("null")
const makeRelaxed = () =>
	type({ k: "'a'", "+": "reject" }).or({ k: "'b'", "+": "reject" }).onUndeclaredKey("ignore").or("null")
const first = ${strictFirst ? "makeStrict()" : "makeRelaxed()"}
const second = ${strictFirst ? "makeRelaxed()" : "makeStrict()"}
const [S, R] = ${strictFirst ? "[first, second]" : "[second, first]"}
console.log(S === R, S.allows({ k: "a", z: 1 }), R.allows({ k: "a", z: 1 }))`)
				attest(out).equals("false false true\n")
			}
		})

		it("does not drop onUndeclaredKey when chaining array length bounds", () => {
			for (const strictFirst of [true, false]) {
				const out =
					printed(`const makeStrict = () => type("string[]").onUndeclaredKey("reject").atLeastLength(1)
const makeLoose = () => type("string[]").atLeastLength(1)
const first = ${strictFirst ? "makeStrict()" : "makeLoose()"}
const second = ${strictFirst ? "makeLoose()" : "makeStrict()"}
const [S, L] = ${strictFirst ? "[first, second]" : "[second, first]"}
const arr = ["x"]
arr.extra = 1
console.log(S === L, S.allows(arr), L.allows(arr), S.allows(["x"]))`)
				attest(out).equals("false false true true\n")
			}
		})
	})

	describe("intersection and morph cache isolation", () => {
		it("a description of an intersection isn't one of its last operand", () => {
			for (const wholeFirst of [true, false]) {
				const out =
					printed(`const makeWhole = () => type("string").and(/b/).describe("x")
const makeOperand = () => type("string").describe("x").and(/b/)
const first = ${wholeFirst ? "makeWhole()" : "makeOperand()"}
const second = ${wholeFirst ? "makeOperand()" : "makeWhole()"}
const [Whole, Operand] = ${wholeFirst ? "[first, second]" : "[second, first]"}
console.log(Whole === Operand, Whole.description, Operand.description)`)
				attest(out).equals("false x matched by b\n")
			}
		})

		it("a description of a morph isn't one of what it pipes to", () => {
			for (const wholeFirst of [true, false]) {
				const out =
					printed(`const makeWhole = () => type("string.trim").to("string").describe("x")
const makeOutput = () => type("string.trim").to(type("string").describe("x"))
const first = ${wholeFirst ? "makeWhole()" : "makeOutput()"}
const second = ${wholeFirst ? "makeOutput()" : "makeWhole()"}
const [Whole, Output] = ${wholeFirst ? "[first, second]" : "[second, first]"}
console.log(Whole === Output, String(Whole(5)), String(Output(5)))`)
				attest(out).equals("false must be x must be a string\n")
			}
		})

		it("an intersection is its operands in order", () => {
			const dateFirst = type({ a: "string.date & string.url" })
			const urlFirst = type({ a: "string.url & string.date" })
			attest(dateFirst.description).snap(
				"{ a: a parsable date and a URL string }"
			)
			attest(urlFirst.description).snap(
				"{ a: a URL string and a parsable date }"
			)
		})

		it("an intersection of a union isn't a union with an intersection", () => {
			for (const andFirst of [true, false]) {
				const out = printed(`const makeAnd = () => type(/a/).or(/b/).and(/c/)
const makeOr = () => type(/b/).and(/c/).or(/a/)
const first = ${andFirst ? "makeAnd()" : "makeOr()"}
const second = ${andFirst ? "makeOr()" : "makeAnd()"}
const [And, Or] = ${andFirst ? "[first, second]" : "[second, first]"}
console.log(And === Or, And.allows("a"), Or.allows("a"), And.allows("ac"), Or.allows("bc"))`)
				attest(out).equals("false false true true true\n")
			}
		})
	})

	describe("unit and enumerated syntax escaping", () => {
		it("does not interpret single quotes or backslashes as syntax when deferred", () => {
			attest(
				printed(`const U1 = type.unit("a' | 'b")
const U2 = type.unit("x' | string | 'y")
const U3 = type.unit("a\\\\b")
const U4 = type.unit("a\\\\' | number | 'b")
const E = type.enumerated("x' | number | 'y", "z")
console.log(U1.expression, U1.allows("a' | 'b"), U1.allows("a"), U1.allows("b"))
console.log(U2.allows("x' | string | 'y"), U2.allows("anything"))
console.log(U3.allows("a\\\\b"), U3.allows("ab"))
console.log(U4.allows("a\\\\' | number | 'b"), U4.allows(1))
console.log(E.allows("x' | number | 'y"), E.allows("z"), E.allows(5), E.allows("x"))`)
			).snap(
				`"a' | 'b" true false false\ntrue false\ntrue false\ntrue false\ntrue true false false\n`
			)
		})

		it("still defers safe unit and enumerated strings", () => {
			attest(
				printed(`const u = type.unit("safe")
const e = type.enumerated("a", 1)
console.log(
	Object.hasOwn(u, "kind"),
	Object.hasOwn(e, "kind"),
	u === type("'safe'"),
	e === type("1 | 'a'")
)`)
			).snap("false false true true\n")
		})
	})

	describe("default cache key escaping and -0 isolation", () => {
		it("prevents string default values from impersonating sibling props in both orders", () => {
			for (const twoPropsFirst of [true, false]) {
				const out =
					printed(`const makeTwo = () => type({ a: "string = 'x'", b: "string = 'y'" })
const makeOne = () => type({ a: "string = 'x,1b:string=string:y'" })
const makeQuoted = () => type({ a: ["string", "=", 'x",1b:string=string:"y'] })
const first = ${twoPropsFirst ? "makeTwo()" : "makeOne()"}
const second = ${twoPropsFirst ? "makeOne()" : "makeTwo()"}
const Quoted = makeQuoted()
const [Two, One] = ${twoPropsFirst ? "[first, second]" : "[second, first]"}
console.log(
	Two === One,
	Two === Quoted,
	One === Quoted,
	JSON.stringify(Two({})),
	JSON.stringify(One({})),
	JSON.stringify(Quoted({}))
)`)
				attest(out).equals(
					'false false false {"a":"x","b":"y"} {"a":"x,1b:string=string:y"} {"a":"x\\",1b:string=string:\\"y"}\n'
				)
			}
		})

		it("distinguishes -0 and 0 defaults in both creation orders", () => {
			for (const posFirst of [true, false]) {
				const out =
					printed(`const makePos = () => type({ a: ["number", "=", 0] })
const makeNeg = () => type({ a: ["number", "=", -0] })
const first = ${posFirst ? "makePos()" : "makeNeg()"}
const second = ${posFirst ? "makeNeg()" : "makePos()"}
const [Pos, Neg] = ${posFirst ? "[first, second]" : "[second, first]"}
console.log(
	Pos === Neg,
	Object.is(Pos({}).a, 0),
	Object.is(Neg({}).a, -0)
)`)
				attest(out).equals("false true true\n")
			}
		})

		it("distinguishes -0 and 0 bounds in both creation orders", () => {
			for (const posFirst of [true, false]) {
				const out =
					printed(`const makePos = () => [type("number").atMost(0), type("string").atMostLength(0)]
const makeNeg = () => [type("number").atMost(-0), type("string").atMostLength(-0)]
const first = ${posFirst ? "makePos()" : "makeNeg()"}
const second = ${posFirst ? "makeNeg()" : "makePos()"}
const [Pos, Neg] = ${posFirst ? "[first, second]" : "[second, first]"}
console.log(
	Pos[0] === Neg[0],
	Pos[0].json.max,
	Neg[0].json.max,
	Pos[1] === Neg[1],
	Pos[1].json.exactLength,
	Neg[1].json.exactLength
)`)
				attest(out).equals("false 0 -0 false 0 -0\n")
			}
		})
	})
})
