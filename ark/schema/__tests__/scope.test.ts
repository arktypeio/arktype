import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	intrinsic,
	rootSchema,
	schemaScope,
	type ArkErrors,
	type NodeId
} from "@ark/schema"
import { arrayIndexMatcher } from "@ark/schema/internal/structure/shared.ts"
import { jsTypeOfDescriptions, printable } from "@ark/util"

contextualize(() => {
	it("has jit in scope", () => {
		const types = schemaScope({
			foo: {
				domain: "string"
			}
		}).export()

		attest(types.foo.precompilation).satisfies("string")
	})

	it("has jit standalone", () => {
		const node = rootSchema({
			domain: "string"
		})

		attest(node.precompilation).satisfies("string")
	})

	it("enumerates the intrinsics", () => {
		attest(Object.keys(intrinsic)).snap([
			"bigint",
			"boolean",
			"false",
			"never",
			"null",
			"number",
			"object",
			"string",
			"symbol",
			"true",
			"unknown",
			"undefined",
			"Array",
			"Date",
			"integer",
			"lengthBoundable",
			"key",
			"nonNegativeIntegerString",
			"jsonPrimitive",
			"jsonObject",
			"jsonData",
			"emptyStructure"
		])
		attest("string" in intrinsic).equals(true)
		attest(
			Object.entries(intrinsic).every(
				([k, v]) => v === $ark.intrinsic[k as keyof typeof intrinsic]
			)
		).equals(true)
	})

	it("reference", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				required: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "string"
			}
		}).export()
		attest(types.a.json).snap({
			domain: "object",
			required: [{ key: "b", value: "string" }]
		})
		attest(types.b.json).snap({ domain: "string" })
	})
	it("cyclic", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				required: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "object",
				required: {
					key: "a",
					value: "$a"
				}
			}
		}).export()

		const reference = `$ark.${types.a.id}`

		attest(types.a.json).equals({
			domain: "object",
			required: [
				{
					key: "b",
					value: {
						domain: "object",
						required: [{ key: "a", value: reference }]
					}
				}
			]
		})

		attest(types.b.json).equals({
			domain: "object",
			required: [{ key: "a", value: reference }]
		})

		const a = {} as { b: typeof b }
		const b = { a }
		a.b = b

		const almostB = { a: { b: { a: { b: "whoops" } } } }

		attest(types.a.allows(a)).equals(true)
		attest(types.a(a)).equals(a)
		attest(types.b(b)).equals(b)
		attest(types.b.allows(b)).equals(true)
		attest(types.b.allows(almostB)).equals(false)
		attest(types.b(almostB)?.toString()).snap(
			"a.b.a.b must be an object (was a string)"
		)
	})

	it("allows multiple scopes with the same name without collision", () => {
		const s1 = schemaScope({ a: { domain: "string" } }, { name: "Array" })
		const s2 = schemaScope({ b: { domain: "number" } }, { name: "Array" })
		attest(s1.name).equals("Array")
		attest(s2.name).equals("Array")
	})

	it("applies roots with reserved or shadowing ids", () => {
		for (const id of [
			"allows",
			"apply",
			"transform",
			"TransformErrors",
			"Traversal",
			"config",
			"in"
		] as NodeId[]) {
			const Obj = schemaScope({}).parse(
				{ domain: "object", required: [{ key: "a", value: "string" }] },
				{ id }
			)
			attest(Obj({ a: "s" })).equals({ a: "s" })
			attest(String(Obj({ a: 1 }))).equals("a must be a string (was a number)")

			const Morph = schemaScope({}).parse(
				{ in: "string", morphs: [(s: string) => s.length] },
				{ id }
			)
			attest(Morph("s")).equals(1)
			attest(String(Morph(1))).equals("must be a string (was a number)")
		}
	})

	it("compiles a root with 36,000 predicates", () => {
		const predicate = Array.from(
			{ length: 36_000 },
			(_, i) => (n: number) => n !== i
		)
		const T = rootSchema({ domain: "number", predicate }, { prereduced: true })
		attest(T.precompilation).satisfies("string")
		attest(T.allows(0.5)).equals(true)
		attest(T.allows(35_999)).equals(false)
	})

	it("registers nothing only compiled traversals read", () => {
		const epoch = new Date(0)
		const make = (key: string) =>
			rootSchema({
				domain: "object",
				required: [
					{ key, value: "string" },
					{ key: "n", value: { domain: "number", min: 0, max: 100 } },
					{ key: "d", value: { proto: Date, after: epoch } },
					{ key: "u", value: [{ unit: 1 }, { unit: "a" }] },
					{ key: "v", value: ["string", "number"] },
					{
						key: "t",
						value: {
							proto: Array,
							sequence: { prefix: ["string"], defaultables: [["number", 0]] },
							undeclared: "delete"
						}
					}
				],
				optional: [{ key: "o", value: "number", default: 5 }],
				undeclared: "reject"
			})
		const invalid = { n: 500, d: new Date(-1), u: 2, v: true, t: [1, 2], x: 1 }
		make("warm")(invalid)
		const registeredCount = Object.keys($ark).length
		const T = make("fresh")
		attest(
			T({ fresh: "s", n: 5, d: new Date(1), u: 1, v: 1, t: ["s"] })
		).equals({
			fresh: "s",
			n: 5,
			d: new Date(1),
			u: 1,
			v: 1,
			t: ["s", 0],
			o: 5
		})
		attest((T(invalid) as ArkErrors).count).equals(7)
		attest(Object.keys($ark).length).equals(registeredCount)
	})

	it("registers nothing for own morphs, defaults and unions", () => {
		const length = (s: string) => s.length
		const make = (seed: number) => {
			const key = `own${seed}`
			return rootSchema({
				domain: "object",
				required: [
					{ key, value: { domain: "number", max: seed * 10 } },
					{ key: "u", value: [{ unit: seed }, { unit: "a" }, { unit: "b" }] },
					{
						key: "k",
						value: [
							{ domain: "object", required: [{ key, value: { unit: "x" } }] },
							{ domain: "object", required: [{ key, value: { unit: "y" } }] }
						]
					},
					{
						key: "m",
						value: {
							in: "string",
							morphs: [length, rootSchema({ domain: "number", max: seed * 10 })]
						}
					},
					{
						key: "w",
						value: {
							domain: "object",
							required: [{ key, value: "number" }],
							undeclared: "delete"
						}
					},
					{
						key: "t",
						value: {
							proto: Array,
							sequence: {
								prefix: ["string"],
								defaultables: [["number", seed]]
							},
							undeclared: "delete"
						}
					}
				],
				optional: [{ key: "o", value: "number", default: seed }],
				undeclared: "reject"
			})
		}
		const valid = (seed: number) => ({
			[`own${seed}`]: seed,
			u: "a",
			k: { [`own${seed}`]: "x" },
			m: "abc",
			w: { [`own${seed}`]: 1, extra: 1 },
			t: ["s"]
		})
		const invalid = (seed: number) => ({
			[`own${seed}`]: seed * 10 + 1,
			u: 3,
			k: { [`own${seed}`]: "z" },
			m: 1,
			w: {},
			t: [1, "x"],
			x: 1
		})
		const Warm = make(1)
		Warm(valid(1))
		Warm(invalid(1))
		const registeredCount = Object.keys($ark).length
		const T = make(2)
		attest(T(valid(2))).equals({
			own2: 2,
			u: "a",
			k: { own2: "x" },
			m: 3,
			w: { own2: 1 },
			t: ["s", 2],
			o: 2
		})
		attest((T(invalid(2)) as ArkErrors).count).equals(8)
		attest(Object.keys($ark).length).equals(registeredCount)
		const values = Object.values($ark)
		for (const value of [printable, jsTypeOfDescriptions, arrayIndexMatcher])
			attest(values.includes(value)).equals(false)
	})
})
