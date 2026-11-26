import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { IntersectionNode, UnionNode, UnitNode } from "@ark/schema"
import { hasOwn } from "@ark/util"
import { scope, type } from "arktype"
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
const X = type.or("undefined", ["this", "[]"]).pipe(v => v)
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
	})

	// https://github.com/arktypeio/arktype/issues/1751
	describe("frozen and non-extensible deferred Types", () => {
		it("supports Object.freeze before first call or property read", () => {
			const Frozen = Object.freeze(type({ frozenProp: "string" }))
			// direct call (cold + warm)
			attest(Frozen({ frozenProp: "ok" })).equals({ frozenProp: "ok" })
			attest(Frozen({ frozenProp: "ok2" })).equals({ frozenProp: "ok2" })
			attest(Frozen({ frozenProp: 1 }).toString()).snap(
				"frozenProp must be a string"
			)
			// methods, getters, Standard Schema, JSON Schema, instanceof
			attest(Frozen.allows({ frozenProp: "ok" })).equals(true)
			attest(Frozen.allows({ frozenProp: 1 })).equals(false)
			attest(Frozen.assert({ frozenProp: "ok" })).equals({ frozenProp: "ok" })
			attest(Frozen.expression).snap("{ frozenProp: string }")
			attest(Frozen.toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { frozenProp: { type: "string" } },
				required: ["frozenProp"]
			})
			attest(Frozen["~standard"].validate({ frozenProp: "ok" })).equals({
				value: { frozenProp: "ok" }
			})
			attest(Frozen instanceof IntersectionNode).equals(true)
			attest(Frozen instanceof UnionNode).equals(false)
			// composition & embedding
			const Extended = Frozen.and({ extra: "number" })
			attest(Extended({ frozenProp: "ok", extra: 1 })).equals({
				frozenProp: "ok",
				extra: 1
			})
			const Piped = Frozen.pipe(v => v.frozenProp.length)
			attest(Piped({ frozenProp: "abc" })).equals(3)
			const Embedded = type({ inner: Frozen })
			attest(Embedded({ inner: { frozenProp: "hi" } })).equals({
				inner: { frozenProp: "hi" }
			})
		})

		it("supports Object.freeze on unread chained, cyclic, sealed, and eager Types", () => {
			const Chained = Object.freeze(type({ sealedProp: "string" }))
			const Combined = Chained.or("number")
			attest(Combined({ sealedProp: "a" })).equals({ sealedProp: "a" })
			attest(Combined(5)).equals(5)

			const Sealed = Object.seal(type({ sealedKey: "number" }))
			attest(Sealed({ sealedKey: 1 })).equals({ sealedKey: 1 })
			attest(Sealed.allows({ sealedKey: "x" })).equals(false)

			const NonExt = Object.preventExtensions(type({ nonExtKey: "boolean" }))
			attest(NonExt({ nonExtKey: true })).equals({ nonExtKey: true })

			const Cyclic = Object.freeze(
				type({ frozenNode: "string", "next?": "this" })
			)
			attest(Cyclic.expression).snap("{ frozenNode: string, next?: this }")
			attest(Cyclic({ frozenNode: "a", next: { frozenNode: "b" } })).equals({
				frozenNode: "a",
				next: { frozenNode: "b" }
			})

			const Eager = Object.freeze(type.raw({ eagerFrozen: "string" }))
			for (let i = 0; i < 3; i++) {
				attest(Eager({ eagerFrozen: "ok" })).equals({ eagerFrozen: "ok" })
				attest(Eager.allows({ eagerFrozen: "ok" })).equals(true)
				attest(Eager.allows({ eagerFrozen: 1 })).equals(false)
			}
			// post-2nd-call operations & lazy memos on frozen eager/settled Types
			attest(Eager.in.expression).snap("{ eagerFrozen: string }")
			attest(Eager.out.expression).snap("{ eagerFrozen: string }")
			attest(Eager.and("unknown").expression).snap("{ eagerFrozen: string }")
			attest(Eager["~standard"].validate({ eagerFrozen: "ok" })).equals({
				value: { eagerFrozen: "ok" }
			})
			attest(Eager.internal.keyof().expression).snap('"eagerFrozen"')

			// frozen eager discriminated union (lazy _disc / _discCases / _missContexts / _errorCtx)
			const FrozenUnion = Object.freeze(
				type.raw({ kind: "'a'", a: "string" }).or({ kind: "'b'", b: "number" })
			)
			for (let i = 0; i < 3; i++) {
				attest(FrozenUnion({ kind: "a", a: "hi" })).equals({
					kind: "a",
					a: "hi"
				})
				attest(FrozenUnion({ kind: "c" }).toString()).snap(
					'kind must be "a" or "b"'
				)
				attest(FrozenUnion.allows({ kind: "b", b: 1 })).equals(true)
			}
			attest(FrozenUnion["~standard"].validate({ kind: "b", b: 1 })).equals({
				value: { kind: "b", b: 1 }
			})

			// frozen eager morph pipeline (lazy _traversedMorphs) & basis errorCtx
			const FrozenPipe = Object.freeze(
				type
					.raw("string")
					.pipe(s => s.trim(), type.raw("string > 0"))
					.configure({ message: "bad pipe" })
			)
			for (let i = 0; i < 3; i++) {
				attest(FrozenPipe(" ok ")).equals("ok")
				attest(FrozenPipe("   ").toString()).snap("bad pipe")
			}

			// frozen eager scope export (including cyclic alias)
			const FrozenScoped = Object.freeze(
				scope({
					node: { label: "string", "next?": "node" }
				}).export().node
			)
			for (let i = 0; i < 3; i++) {
				attest(FrozenScoped({ label: "a", next: { label: "b" } })).equals({
					label: "a",
					next: { label: "b" }
				})
				attest(FrozenScoped.allows({ label: 1 })).equals(false)
			}
			attest(FrozenScoped.keyof().expression).snap('"label" | "next"')
			attest(FrozenScoped["~standard"].validate({ label: "x" })).equals({
				value: { label: "x" }
			})

			// settled-before-freeze Type
			const SettledBeforeFreeze = type({ settledFirst: "string" })
			void SettledBeforeFreeze.expression
			Object.freeze(SettledBeforeFreeze)
			for (let i = 0; i < 3; i++) {
				attest(SettledBeforeFreeze({ settledFirst: "ok" })).equals({
					settledFirst: "ok"
				})
				attest(SettledBeforeFreeze.allows({ settledFirst: 1 })).equals(false)
			}
			attest(SettledBeforeFreeze.in.expression).snap("{ settledFirst: string }")
			attest(SettledBeforeFreeze.out.expression).snap(
				"{ settledFirst: string }"
			)
			attest(SettledBeforeFreeze.and("unknown").expression).snap(
				"{ settledFirst: string }"
			)
			attest(
				SettledBeforeFreeze["~standard"].validate({ settledFirst: "ok" })
			).equals({ value: { settledFirst: "ok" } })
			attest(SettledBeforeFreeze.keyof().expression).snap('"settledFirst"')

			// rawPipeOnce unwraps frozen deferred shell cleanly
			const FrozenUnread = Object.freeze(type({ pipedFrozen: "string" }))
			const PipedToFrozen = type("unknown").pipe(v => v, FrozenUnread)
			attest(PipedToFrozen.internal.assertIs("morph").tail).is(
				FrozenUnread.internal
			)
			attest(PipedToFrozen({ pipedFrozen: "ok" })).equals({
				pipedFrozen: "ok"
			})
			attest(PipedToFrozen({ pipedFrozen: 1 }).toString()).snap(
				"pipedFrozen must be a string"
			)
		})
	})
})
