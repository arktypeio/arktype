import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { ParseError, type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"
import { writeUnexpectedTupleElementsMessage } from "arktype/internal/parser/tupleExpressions.ts"
import { spawnSync } from "node:child_process"

const anyType: any = type

const runFresh = (body: string): string => {
	const result = spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--input-type=module",
			"-e",
			`import { type } from "arktype"\n${body}`
		],
		{ cwd: fromHere(".."), encoding: "utf8" }
	)
	if (result.status !== 0)
		throw new Error(result.stderr || `Subprocess exited with ${result.status}`)
	return result.stdout
}

const expectParseError = (fn: () => unknown, message: string): void => {
	let caught: unknown
	try {
		fn()
	} catch (e) {
		caught = e
	}
	attest(caught instanceof ParseError).equals(true)
	attest((caught as Error).message).equals(message)
}

contextualize(() => {
	describe("deferred onUndeclaredKey cache isolation", () => {
		it("does not collide when loose union is created before strict union", () => {
			attest(
				runFresh(`const Loose = type({ a: "string" }).or({ b: "number" }).or("null")
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
				runFresh(`const Strict = type({ a: "string" }).or({ b: "number" }).onUndeclaredKey("reject").or("null")
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
				const out = runFresh(`const makeWhole = () =>
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
				const out = runFresh(`const makeStrict = () =>
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
					runFresh(`const makeStrict = () => type("string[]").onUndeclaredKey("reject").atLeastLength(1)
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

	describe("type.unit and type.enumerated syntax injection", () => {
		it("does not interpret single quotes or backslashes as syntax when deferred", () => {
			attest(
				runFresh(`const U1 = type.unit("a' | 'b")
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
				runFresh(`const u = type.unit("safe")
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

	describe("deferred default keys escaping and -0 isolation", () => {
		it("prevents string default values from impersonating sibling props in both orders", () => {
			for (const twoPropsFirst of [true, false]) {
				const out =
					runFresh(`const makeTwo = () => type({ a: "string = 'x'", b: "string = 'y'" })
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
					runFresh(`const makePos = () => type({ a: ["number", "=", 0] })
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

		it("does not collide on distinct symbols with the same description", () => {
			const s1 = Symbol("dup")
			const s2 = Symbol("dup")
			const E = type.enumerated(s1, s2)
			void E.expression
			const T1 = type({ a: [E, "=", s1] })
			const T2 = type({ a: [E, "=", s2] })
			attest(Object.is(T1, T2)).equals(false)
			attest(T1.assert({}).a).equals(s1)
			attest(T2.assert({}).a).equals(s2)
		})
	})

	describe("tuple expression arity validation", () => {
		it("throws ParseError on trailing elements for infix, postfix, and prefix operators", () => {
			const cases: [unknown[], string][] = [
				[
					["string", "&", "/a/", "&", "/b/"],
					writeUnexpectedTupleElementsMessage("&", 3, 5)
				],
				[
					["'a'", "|", "'b'", "|", "'c'"],
					writeUnexpectedTupleElementsMessage("|", 3, 5)
				],
				[
					["number", "|", "string", "extra"],
					writeUnexpectedTupleElementsMessage("|", 3, 4)
				],
				[
					["string", "|>", "string.trim", "|>", "string"],
					writeUnexpectedTupleElementsMessage("|>", 3, 5)
				],
				[
					["string", "[]", "extra"],
					writeUnexpectedTupleElementsMessage("[]", 2, 3)
				],
				[
					["string", "?", "extra"],
					writeUnexpectedTupleElementsMessage("?", 2, 3)
				],
				[
					["string", "=", "a", "extra"],
					writeUnexpectedTupleElementsMessage("=", 3, 4)
				],
				[
					["keyof", { a: "string" }, "extra"],
					writeUnexpectedTupleElementsMessage("keyof", 2, 3)
				],
				[
					["string", ":", (s: string) => s.length > 0, "extra"],
					writeUnexpectedTupleElementsMessage(":", 3, 4)
				],
				[
					["string", "=>", (s: string) => s.length, "extra"],
					writeUnexpectedTupleElementsMessage("=>", 3, 4)
				],
				[
					["string", "@", "desc", "self", "extra"],
					writeUnexpectedTupleElementsMessage("@", "3 or 4", 5)
				]
			]

			for (const [def, expected] of cases) {
				expectParseError(() => anyType(def), expected)
				expectParseError(() => anyType(...def), expected)
			}
		})

		it("throws ParseError on missing right operands", () => {
			const missing: [unknown[], string][] = [
				[["keyof"], writeMissingRightOperandMessage("keyof", "")],
				[["string", ":"], writeMissingRightOperandMessage(":", "")],
				[["string", "=>"], writeMissingRightOperandMessage("=>", "")],
				[["string", "@"], writeMissingRightOperandMessage("@", "")],
				[["string", "="], writeMissingRightOperandMessage("=", "")]
			]
			for (const [def, expected] of missing)
				expectParseError(() => anyType(def), expected)
		})

		it("still accepts valid arities including 3- and 4-element @ and variadic === / instanceof", () => {
			attest(type(["string", "[]"]).expression).snap("string[]")
			attest(type(["keyof", { a: "string" }]).expression).snap('"a"')
			attest(type(["string", "@", "a label"]).description).equals("a label")
			attest(
				type([
					{ a: "string", b: "number" },
					"@",
					{ description: "str" },
					{
						kind: "domain",
						where: d => d.assertIs("domain").domain === "string"
					}
				]).get("a").description
			).equals("str")
			attest(type(["===", "a", "b", "c"]).expression).snap('"a" | "b" | "c"')
			attest(type(["instanceof", Date, Map]).expression).snap("Date | Map")
		})
	})
})
