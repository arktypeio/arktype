import { attest, contextualize } from "@ark/attest"
import { writeMissingInverseMessage } from "@ark/schema/codecs"
import { fromJsonSchema, scope, type } from "arktype"
import "arktype/codecs"

contextualize(() => {
	describe("union length discrimination (#1 & #2)", () => {
		it("does not drop a branch via derived empty-array length disjoint (#1)", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const T = $.type("string[] == 1 | number[] <= 2 | d'2020-01-01'")
				const expected: [unknown, boolean][] = [
					[[1, 2], true],
					[[1], true],
					[["a"], true],
					[[], true],
					[new Date("2020-01-01"), true],
					[["a", "b"], false],
					[[1, 2, 3], false],
					["nope", false]
				]
				// verify both cold (call 1) and warm (post-JIT call 2)
				for (let pass = 0; pass < 2; pass++) {
					for (const [input, allowed] of expected) {
						attest(T.allows(input)).equals(allowed)
						attest(!(T(input) instanceof type.errors)).equals(allowed)
					}
				}
			}

			const Wrapped = type({
				tags: "string[] == 1 | number[] <= 2 | d'2020-01-01'"
			})
			attest(Wrapped.allows({ tags: [1, 2] })).equals(true)
			attest(Wrapped.allows({ tags: [1, 2] })).equals(true)
			attest(Wrapped.allows({ tags: ["a", "b"] })).equals(false)

			// distinct declared exact lengths still discriminate on length
			const Exact = type("string[] == 1 | number[] == 2 | d'2020-01-01'")
			attest(Exact.internal.assertIs("union").discriminant?.path).equals([
				"length"
			])
			attest(Exact.allows(["a"])).equals(true)
			attest(Exact.allows([1, 2])).equals(true)
			attest(Exact.allows(new Date("2020-01-01"))).equals(true)
			attest(Exact.allows([1])).equals(false)
			attest(Exact.allows([])).equals(false)
		})

		it("keeps index-signature and reject branches reachable across length switches (#2)", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const Rec = $.type([
					[["string"], "|", ["number", "number"]],
					"|",
					"Record<string, string>"
				])
				for (let pass = 0; pass < 2; pass++) {
					attest(Rec.allows(["a", "b"])).equals(true)
					attest(Rec(["a", "b"])).unknown.equals(["a", "b"])
					attest(Rec.allows(["a"])).equals(true)
					attest(Rec.allows([1, 2])).equals(true)
					attest(Rec.allows({ a: "x" })).equals(true)
					attest(Rec.allows([1, "a"])).equals(false)
					attest(Rec.allows({ length: 2, a: "x" })).equals(false)
				}

				const Reject = $.type([
					"unknown[] == 1 | number[] == 0",
					"|",
					{ "+": "reject" }
				])
				const fn0 = () => 1
				const fn1 = (x: unknown) => x
				for (let pass = 0; pass < 2; pass++) {
					attest(Reject.allows(fn0)).equals(true)
					attest(Reject.allows(fn1)).equals(true)
					attest(Reject.allows([])).equals(true)
					attest(Reject.allows([1])).equals(true)
					attest(Reject.allows({})).equals(true)
					attest(Reject.allows([1, 2])).equals(false)
					attest(Reject.allows({ length: 1 })).equals(false)
				}

				// built-in non-enumerable Function.name with "+": "reject"
				const ByName = $.type({ name: "'foo'", x: "string" })
					.or({ name: "'bar'", y: "number" })
					.or({ "+": "reject" })
				const foo = function foo() {}
				for (let pass = 0; pass < 2; pass++) {
					attest(ByName.allows(foo)).equals(true)
					attest(ByName.allows({ name: "foo" })).equals(false)
				}

				// nested Record inside tuple element
				const TupleRec = $.type([["string"]])
					.or([["number", "number"]])
					.or(["Record<string, string>"])
				for (let pass = 0; pass < 2; pass++) {
					attest(TupleRec.allows([["a", "b"]])).equals(true)
					attest(TupleRec.allows([[1, "a"]])).equals(false)
				}
			}

			// a declared optional prop still checks via `in`, so it excludes arrays/functions
			const DeclaredOpt = type(["string"])
				.or(["number", "number"])
				.or({ "length?": "string" })
			attest(DeclaredOpt.allows(["a", "b"])).equals(false)
			attest(DeclaredOpt.allows(["a", "b"])).equals(false)
		})
	})

	describe("recursive codecs and narrowed codec pipes (R1, C1, C2, #1764)", () => {
		it("resolves .out and .toJsonSchema on recursive piped codecs (R1)", () => {
			const L = scope({
				Node: { v: "string.numeric.parse", "kids?": "Node[]" },
				Json: "string.json.parse |> Node"
			}).export()

			const decoded = { v: 1, kids: [{ v: 2 }] }
			attest(L.Json.out(decoded)).equals(decoded)
			attest(L.Json.out.expression).snap("{ v: number, kids?: Out<$Node>[] }")

			const outSchema = L.Json.out.toJsonSchema()
			attest(outSchema).equals(L.Json.toJsonSchema({ io: "out" }))
			attest("$defs" in outSchema).equals(true)
		})

		it("encodes recursive piped codecs at arbitrary depth (C2 / #1764.3)", () => {
			const L = scope({
				Node: { v: "string.numeric.parse", "kids?": "Node[]" },
				Json: "string.json.parse |> Node"
			}).export()

			const deep = { v: 1, kids: [{ v: 2, kids: [{ v: 3 }] }] }
			const encoded = L.Json.encode(deep)
			attest(encoded).snap('{"v":"1","kids":[{"v":"2","kids":[{"v":"3"}]}]}')
			attest(L.Json(encoded)).equals(deep)

			// cycle running back through the pipe itself must not overflow
			const Cyc = scope({
				Json: "string.json.parse |> Node",
				Node: { v: "string.numeric.parse", "child?": "Json" }
			}).export()
			const nested = { v: 1, child: { v: 2, child: { v: 3 } } }
			const encodedNested = Cyc.Json.encode(nested)
			attest(typeof encodedNested).equals("string")
			attest(Cyc.Json(encodedNested)).equals(nested)
			attest(Cyc.Json.encode.encode(encodedNested)).equals(nested)

			// missing inverse inside recursive pipe still throws ParseError
			const NoInv = scope({
				Node: { v: ["string", "=>", s => s.length], "kids?": "Node[]" },
				Json: "string.json.parse |> Node"
			}).export()
			attest(() => NoInv.Json.encode).throws(
				writeMissingInverseMessage("(In: string) => Out<unknown>")
			)
		})

		it("encodes recursive unions containing codec branches (C1)", () => {
			const Val = scope({
				Val: "string.date.iso.parse | Val[]"
			}).export().Val
			const d0 = new Date(0)
			const d1 = new Date(1)
			const encodedVal = Val.encode([d0, [d1]])
			attest(encodedVal).equals([d0.toISOString(), [d1.toISOString()]])
			attest(Val(encodedVal)).equals([d0, [d1]])

			const Mixed = scope({
				Val: "number | string.date.iso.parse | Val[]"
			}).export().Val
			const encodedMixed = Mixed.encode([42, d0, [7, d1]])
			attest(encodedMixed).equals([42, d0.toISOString(), [7, d1.toISOString()]])
			attest(Mixed(encodedMixed)).equals([42, d0, [7, d1]])

			const Expr = scope({
				Expr: "Lit | Add",
				Lit: { kind: "'lit'", v: "string.numeric.parse" },
				Add: { kind: "'add'", l: "Expr", r: "Expr" }
			}).export().Expr
			const tree = {
				kind: "add",
				l: { kind: "lit", v: 1 },
				r: { kind: "add", l: { kind: "lit", v: 2 }, r: { kind: "lit", v: 3 } }
			} as const
			const encodedTree = Expr.encode(tree)
			attest(encodedTree).equals({
				kind: "add",
				l: { kind: "lit", v: "1" },
				r: {
					kind: "add",
					l: { kind: "lit", v: "2" },
					r: { kind: "lit", v: "3" }
				}
			})
			attest(Expr(encodedTree)).equals(tree)
		})

		it("keeps #1764.1 narrowed codec validation while letting .to() replace output", () => {
			const After2000 = type("string.date.iso.parse").narrow(
				d => d.getFullYear() > 2000
			)
			attest(After2000.encode("not a date").toString()).snap("must be a Date")
			attest(After2000.out("not a date").toString()).snap("must be a Date")
			attest(
				After2000.encode(new Date("1999-01-01T00:00:00.000Z")).toString()
			).snap("must be valid according to an anonymous predicate")
			attest(After2000.encode(new Date("2025-01-01T00:00:00.000Z"))).equals(
				"2025-01-01T00:00:00.000Z"
			)

			const JanAfter2000 = After2000.narrow(d => d.getUTCMonth() === 0)
			attest(JanAfter2000.encode("not a date").toString()).snap(
				"must be a Date"
			)
			attest(
				JanAfter2000.encode(new Date("2025-02-01T00:00:00.000Z")) instanceof
					type.errors
			).equals(true)
			attest(JanAfter2000.encode(new Date("2025-01-01T00:00:00.000Z"))).equals(
				"2025-01-01T00:00:00.000Z"
			)
		})
	})

	describe("fromJsonSchema recursive $ref in opaque predicates (#8)", () => {
		it("compiles and validates not/oneOf/if beside sibling keywords", () => {
			const S1 = fromJsonSchema({
				properties: { next: { not: { $ref: "#" }, minimum: 0 } }
			})
			// primitives satisfy S1 (properties only constrains objects), so not(#) rejects them
			for (let pass = 0; pass < 2; pass++) {
				attest(S1.allows({})).equals(true)
				attest(S1.allows(true)).equals(true)
				attest(S1.allows({ next: 1 })).equals(false)
				attest(S1.allows({ next: true })).equals(false)
				attest(S1.allows({ next: { next: 1 } })).equals(true)
				attest(S1.allows({ next: { next: { next: 1 } } })).equals(false)
			}

			const S2 = fromJsonSchema({
				items: { const: 1, not: { $ref: "#" } }
			})
			for (let pass = 0; pass < 2; pass++) {
				attest(S2.allows(1)).equals(true)
				attest(S2.allows([])).equals(true)
				attest(S2.allows([1])).equals(false)
				attest(S2.allows([2])).equals(false)
			}

			const S2Arr = fromJsonSchema({
				type: "array",
				items: { const: 1, not: { $ref: "#" } }
			})
			for (let pass = 0; pass < 2; pass++) {
				attest(S2Arr.allows(1)).equals(false)
				attest(S2Arr.allows([])).equals(true)
				attest(S2Arr.allows([1])).equals(true)
				attest(S2Arr.allows([2])).equals(false)
			}

			const S3 = fromJsonSchema({
				type: "object",
				properties: {
					child: {
						required: ["id"],
						oneOf: [{ $ref: "#" }, { required: ["leaf"] }]
					}
				}
			})
			for (let pass = 0; pass < 2; pass++) {
				attest(S3.allows({})).equals(true)
				attest(S3.allows({ child: true })).equals(true)
				attest(S3.allows({ child: { id: 1 } })).equals(true)
				attest(S3.allows({ child: { id: 1, leaf: 1 } })).equals(false)
				attest(S3.allows({ child: { leaf: 1 } })).equals(false)
			}

			const S4 = fromJsonSchema({
				properties: {
					next: {
						if: { $ref: "#" },
						then: { minimum: 0 },
						else: { const: true }
					}
				}
			})
			for (let pass = 0; pass < 2; pass++) {
				attest(S4.allows({ next: 1 })).equals(true)
				attest(S4.allows({ next: -1 })).equals(false)
				attest(S4.allows({ next: true })).equals(true)
				attest(S4.allows({ next: { next: -1 } })).equals(false)
			}
		})
	})

	describe("relations on defaulted keys and never (#9 & #14)", () => {
		it("handles defaulted keys and tuple defaults in extends, overlaps, exclude, extract (#9)", () => {
			const A = type({ a: "number = 1" })
			const B = type({ "a?": "string" })

			attest(A.extends(B)).equals(false)
			attest(A.overlaps(B)).equals(true)
			attest(A.exclude(B).expression).snap("{ a: number = 1 }")
			attest(A.extract(B).expression).snap("never")

			attest(type({ a: "number = 1" }).overlaps({ a: "number = 2" })).equals(
				true
			)
			attest(type({ a: "number = 1" }).extends({ a: "number = 2" })).equals(
				true
			)
			attest(type({ a: "number = 1" }).overlaps({ a: "string" })).equals(false)
			attest(type({ a: "number = 1" }).extends({ a: "number" })).equals(false)
			attest(type({ a: "number" }).extends({ a: "number = 1" })).equals(true)

			attest(type(["number = 1"]).overlaps(["number = 2"])).equals(true)
			attest(type(["number = 1"]).extends(["number = 2"])).equals(true)
			attest(type(["number = 1"]).extends(["string?"])).equals(false)
			attest(type(["number = 1"]).overlaps(["string?"])).equals(true)

			// explicit intersection still rejects conflicting defaults
			attest(() => type({ a: "number = 1" }).and({ a: "number = 2" })).throws(
				"Invalid intersection of default values 1 & 2"
			)

			// nested, loose optional, and cyclic defaults
			attest(
				type({ inner: { a: "number = 1" } }).overlaps({
					inner: { "a?": "string" }
				})
			).equals(true)

			const Loose = scope({}, { exactOptionalPropertyTypes: false })
			attest(
				Loose.type({ a: "number = 1" }).extends({ "a?": "string" })
			).equals(false)
			attest(
				Loose.type({ a: "number = 1" }).overlaps({ "a?": "string" })
			).equals(true)
			attest(
				Loose.type({ a: "number = 1" }).overlaps({ a: "number = 2" })
			).equals(true)

			const Cyc = scope({
				Node: { a: "number = 1", "next?": "Node" }
			}).export()
			attest(Cyc.Node.extends({ "a?": "string" })).equals(false)
			attest(Cyc.Node.overlaps({ "a?": "string" })).equals(true)
		})

		it("never does not overlap never (#14)", () => {
			attest(type("never").overlaps("never")).equals(false)
			attest(type("never").overlaps("unknown")).equals(false)
			attest(type("unknown").overlaps("never")).equals(false)
			attest(type("never").overlaps("string")).equals(false)
			attest(type("never").extends("never")).equals(true)
		})
	})
})
