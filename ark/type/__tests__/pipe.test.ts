import { attest, contextualize } from "@arktype/attest"
import {
	assertNodeKind,
	writeIndiscriminableMorphMessage,
	writeMorphIntersectionMessage,
	type MoreThan,
	type Out,
	type of,
	type string
} from "@arktype/schema"
import { scope, type, type Type } from "arktype"

contextualize(() => {
	it("base", () => {
		const t = type("number").pipe(data => `${data}`)
		attest<Type<(In: number) => Out<string>>>(t)
		attest<string>(t.infer)
		attest<number>(t.in.infer)
		const out = t(5)
		attest<string | type.errors>(out).equals("5")
		const result = t("foo")
		attest(result.toString()).snap("must be a number (was string)")
	})

	it("disjoint", () => {
		attest(() => type("number>5").pipe(type("number<3"))).throws.snap(
			"ParseError: Intersection of >5 and <3 results in an unsatisfiable type"
		)
	})

	it("constraints apply to input", () => {
		const t = type("parse.number").atMostLength(5)
		attest<(In: string.atMostLength<5>) => Out<number>>(t.t)

		const morphs = t.internal.assertHasKind("morph").serializedMorphs
		attest(t.json).snap({
			in: {
				domain: "string",
				pattern: [
					{
						description: "a well-formed numeric string",
						flags: "",
						rule: "^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"
					}
				],
				maxLength: 5
			},
			morphs
		})

		attest(t("321")).equals(321)
		attest(t("654321").toString()).snap("must be at most length 5 (was 6)")
	})

	it("within type", () => {
		const t = type(["boolean", "=>", data => !data])
		attest<Type<(In: boolean) => Out<boolean>>>(t)
		const out = t(true)
		attest<boolean | type.errors>(out).equals(false)
	})

	it("type instance reference", () => {
		const user = type({
			name: "string",
			age: "number"
		})
		const parsedUser = type("string").pipe(s => JSON.parse(s), user)

		attest<
			Type<
				(In: string) => Out<{
					name: string
					age: number
				}>
			>
		>(parsedUser)

		const validUser = { name: "David", age: 30 }
		attest(parsedUser(JSON.stringify(validUser))).equals(validUser)
		const missingKey = { name: "David" }
		attest(parsedUser(JSON.stringify(missingKey)).toString()).snap(
			"age must be a number (was missing)"
		)
	})

	it("many pipes", () => {
		const pipeAlphabet = type("'a'").pipe(
			s => `${s}b` as const,
			s => `${s}c` as const,
			s => `${s}d` as const,
			s => `${s}e` as const,
			s => `${s}f` as const,
			s => `${s}g` as const,
			s => `${s}h` as const
		)
		attest<"abcdefgh">(pipeAlphabet.infer)
		attest(pipeAlphabet("a")).equals("abcdefgh")
	})

	it("uses pipe for consecutive types", () => {
		const bar = type({ bar: "number" })
		const t = type({ foo: "string" }).pipe(bar)
		attest<
			Type<{
				foo: string
				bar: number
			}>
		>(t)
		const expected = type({ foo: "string", bar: "number" })
		attest(t.json).equals(expected.json)
	})

	it("disjoint", () => {
		attest(() => type("number>5").pipe(type("number<3"))).throws.snap(
			"ParseError: Intersection of >5 and <3 results in an unsatisfiable type"
		)
	})

	it("uses pipe for many consecutive types", () => {
		const t = type({ a: "1" }).pipe(
			type({ b: "1" }),
			type({ c: "1" }),
			type({ d: "1" })
		)
		attest<
			Type<{
				a: 1
				b: 1
				c: 1
				d: 1
			}>
		>(t)
		const expected = type({ a: "1", b: "1", c: "1", d: "1" })
		attest(t.json).equals(expected.json)
	})

	it("two morphs", () => {
		const inefficientStringIsEmpty = type("string").pipe(
			s => s.length,
			length => length === 0
		)

		attest<Type<(In: string) => Out<boolean>>>(inefficientStringIsEmpty)
		attest(inefficientStringIsEmpty("")).equals(true)
		attest(inefficientStringIsEmpty("foo")).equals(false)
		attest(inefficientStringIsEmpty(0).toString()).snap(
			"must be a string (was number)"
		)
	})

	it("any as out", () => {
		const t = type("string", "=>", s => s as any)
		attest<string>(t.in.infer)
		attest<any>(t.infer)
	})

	it("never as out", () => {
		const t = type("string", "=>", s => s as never)
		attest<string>(t.in.infer)
		attest<never>(t.infer)
	})

	it("return error", () => {
		const divide100By = type("number", "=>", (n, ctx) =>
			n !== 0 ? 100 / n : ctx.error("non-zero")
		)
		attest<Type<(In: number) => Out<number>>>(divide100By)
		attest(divide100By(5)).equals(20)
		attest(divide100By(0).toString()).snap("must be non-zero (was 0)")
	})

	it("at path", () => {
		const t = type({ a: ["string", "=>", data => data.length] })
		attest<Type<{ a: (In: string) => Out<number> }>>(t)

		const input = { a: "four" }

		const out = t(input)

		attest<{ a: number } | type.errors>(out).equals({ a: 4 })
	})

	it("doesn't pipe on error", () => {
		const a = type({ a: "number" }).pipe(o => o.a + 1)

		const aMorphs = a.internal.assertHasKind("morph").serializedMorphs

		const b = type({ a: "string" }, "=>", o => o.a + "!")

		const bMorphs = b.internal.assertHasKind("morph").serializedMorphs

		const t = b.or(a)

		attest<
			Type<
				| ((In: { a: string }) => Out<string>)
				| ((In: { a: number }) => Out<number>)
			>
		>(t)
		attest(t.json).snap([
			{
				in: { required: [{ key: "a", value: "number" }], domain: "object" },
				morphs: aMorphs
			},
			{
				in: { required: [{ key: "a", value: "string" }], domain: "object" },
				morphs: bMorphs
			}
		])

		attest(t({ a: 2 })).snap(3)
	})

	it("in array", () => {
		const types = scope({
			lengthOfString: ["string", "=>", data => data.length],
			mapToLengths: "lengthOfString[]"
		}).export()
		attest<((In: string) => Out<number>)[]>(types.mapToLengths.t)
		const out = types.mapToLengths(["1", "22", "333"])
		attest<number[] | type.errors>(out).equals([1, 2, 3])
	})

	it("object to string", () => {
		const t = type([{ a: "string" }, "=>", data => JSON.stringify(data)])
		const out = t({ a: "foo" })
		attest<string | type.errors>(out).snap('{"a":"foo"}')
	})

	it("intersection", () => {
		const $ = scope({
			b: "3.14",
			a: ["number", "=>", data => `${data}`],
			aAndB: () => $.type("a&b"),
			bAndA: () => $.type("b&a")
		})
		const types = $.export()
		assertNodeKind(types.bAndA.internal, "morph")
		assertNodeKind(types.aAndB.internal, "morph")

		attest<(In: 3.14) => Out<string>>(types.aAndB.t)
		attest(types.aAndB.json).snap({
			in: { unit: 3.14 },
			morphs: types.aAndB.internal.serializedMorphs
		})
		attest<typeof types.aAndB>(types.bAndA)
		attest(types.bAndA).equals(types.aAndB)
	})

	it("object intersection", () => {
		const $ = scope({
			a: [{ a: "1" }, "=>", data => `${data}`],
			b: { b: "2" },
			c: "a&b"
		})
		const types = $.export()
		// TODO: FIX
		// attest<Type<(In: { a: 1; b: 2 }) => string>>(types.c)
		assertNodeKind(types.c.internal, "morph")
		attest(types.c.json).snap({
			in: {
				domain: "object",
				required: [
					{ key: "a", value: { unit: 1 } },
					{ key: "b", value: { unit: 2 } }
				]
			},
			morphs: types.c.internal.serializedMorphs
		})
	})

	it("union", () => {
		const types = scope({
			a: ["number", "=>", data => `${data}`],
			b: "boolean",
			aOrB: "a|b",
			bOrA: "b|a"
		}).export()
		attest<boolean | ((In: number) => Out<string>)>(types.aOrB.t)
		const serializedMorphs =
			types.aOrB.internal.firstReferenceOfKindOrThrow("morph").serializedMorphs
		attest(types.aOrB.json).snap([
			{ in: "number", morphs: serializedMorphs },
			{ unit: false },
			{ unit: true }
		])
		attest<typeof types.aOrB>(types.bOrA)
		attest(types.bOrA.json).equals(types.aOrB.json)
	})

	it("union with output", () => {
		const t = type("number|parse.number")
		attest<number>(t.infer)
		attest<string | number>(t.inferIn)
	})

	it("deep union", () => {
		const types = scope({
			a: { a: ["number>0", "=>", data => `${data}`] },
			b: { a: "Function" },
			c: "a|b"
		}).export()
		attest<
			| {
					a: (In: number) => Out<string>
			  }
			| {
					a: Function
			  }
		>(types.c.t)

		const serializedMorphs =
			types.a.internal.firstReferenceOfKindOrThrow("morph").serializedMorphs

		attest(types.c.json).snap([
			{ domain: "object", required: [{ key: "a", value: "Function" }] },
			{
				domain: "object",
				required: [
					{
						key: "a",
						value: {
							in: {
								domain: "number",
								min: { exclusive: true, rule: 0 }
							},
							morphs: serializedMorphs
						}
					}
				]
			}
		])
	})

	it("chained reference", () => {
		const $ = scope({
			a: type("string").pipe(s => s.length),
			b: () => $.type("a").pipe(n => n === 0)
		})
		const types = $.export()
		attest<(In: string) => Out<boolean>>(types.b.t)
		assertNodeKind(types.b.internal, "morph")
		attest(types.b.json).snap({
			in: "string",
			morphs: types.b.internal.serializedMorphs
		})
	})

	it("chained nested", () => {
		const $ = scope({
			a: type("string").pipe(s => s.length),
			b: () => $.type({ a: "a" }).pipe(({ a }) => a === 0)
		})

		const types = $.export()
		attest<(In: { a: string }) => Out<boolean>>(types.b.t)
		assertNodeKind(types.b.internal, "morph")
		assertNodeKind(types.a.internal, "morph")
		attest(types.b.json).snap({
			in: {
				domain: "object",
				required: [
					{
						key: "a",
						value: {
							in: "string",
							morphs: types.a.internal.serializedMorphs
						}
					}
				]
			},
			morphs: types.b.internal.serializedMorphs
		})
	})

	it("directly nested", () => {
		const t = type(
			{
				// doesn't work with a nested tuple expression here due to a TS limitation
				a: type("string", "=>", s => s.length)
			},
			"=>",
			({ a }) => a === 0
		)
		attest<Type<(In: { a: string }) => Out<boolean>>>(t)
		assertNodeKind(t.internal, "morph")
		const nestedMorph = t.internal.firstReferenceOfKindOrThrow("morph")
		attest(t.json).snap({
			in: {
				domain: "object",
				required: [
					{
						key: "a",
						value: {
							in: "string",
							morphs: nestedMorph.serializedMorphs
						}
					}
				]
			},
			morphs: t.internal.serializedMorphs
		})
	})

	it("discriminable tuple union", () => {
		const $ = scope({
			a: () => $.type(["string"]).pipe(s => [...s, "!"]),
			b: ["number"],
			c: () => $.type("a|b")
		})
		const types = $.export()

		attest<[number] | ((In: [string]) => Out<string[]>)>(types.c.t)
		const expectedSerializedMorphs =
			types.a.internal.assertHasKind("morph").serializedMorphs

		attest(types.c.internal.assertHasKind("union").discriminantJson).snap({
			kind: "domain",
			path: ["0"],
			cases: {
				'"number"': {
					sequence: { prefix: ["number"] },
					proto: "Array",
					exactLength: 1
				},
				'"string"': {
					in: {
						sequence: { prefix: ["string"] },
						proto: "Array",
						exactLength: 1
					},
					morphs: expectedSerializedMorphs
				}
			}
		})
	})

	it("ArkTypeError not included in return", () => {
		const parsedInt = type([
			"string",
			"=>",
			(s, ctx) => {
				const result = Number.parseInt(s)
				if (Number.isNaN(result)) return ctx.error("an integer string")

				return result
			}
		])
		attest<Type<(In: string) => Out<number>>>(parsedInt)
		attest(parsedInt("5")).snap(5)
		attest(parsedInt("five").toString()).snap(
			'must be an integer string (was "five")'
		)
	})

	it("nullable return", () => {
		const toNullableNumber = type(["string", "=>", s => s.length || null])
		attest<Type<(In: string) => Out<number | null>>>(toNullableNumber)
	})

	it("undefinable return", () => {
		const toUndefinableNumber = type([
			"string",
			"=>",
			s => s.length || undefined
		])
		attest<Type<(In: string) => Out<number | undefined>>>(toUndefinableNumber)
	})

	it("null or undefined return", () => {
		const toMaybeNumber = type([
			"string",
			"=>",
			s =>
				s.length === 0 ? undefined
				: s.length === 1 ? null
				: s.length
		])
		attest<Type<(In: string) => Out<number | null | undefined>>>(toMaybeNumber)
	})

	it("deep intersection", () => {
		const types = scope({
			a: { a: ["number>0", "=>", data => data + 1] },
			b: { a: "1" },
			c: "a&b"
		}).export()
		attest<{ a: (In: of<1, MoreThan<0>>) => Out<number> }>(types.c.t)
		const { serializedMorphs } =
			types.a.internal.firstReferenceOfKindOrThrow("morph")

		attest(types.c.json).snap({
			required: [
				{ key: "a", value: { in: { unit: 1 }, morphs: serializedMorphs } }
			],
			domain: "object"
		})
	})

	it("morph intersection", () => {
		attest(() =>
			scope({
				a: ["string", "=>", data => `${data}`],
				b: ["string", "=>", data => `${data}!!!`],
				c: "a&b"
			}).export()
		).throws(
			writeMorphIntersectionMessage(
				"(In: string) => Out<unknown>",
				"(In: string) => Out<unknown>"
			)
		)
	})

	it("indiscriminable union", () => {
		attest(() => {
			scope({
				a: ["/.*/", "=>", s => s.trim()],
				b: "string",
				c: "a|b"
			}).export()
		}).throws(
			writeIndiscriminableMorphMessage(
				"(In: string /.*/) => Out<unknown>",
				"string"
			)
		)
	})

	it("deep morph intersection", () => {
		attest(() => {
			scope({
				a: { a: ["number", "=>", data => `${data}`] },
				b: { a: ["number", "=>", data => `${data}!!!`] },
				c: "a&b"
			}).export()
		}).throws(
			writeMorphIntersectionMessage(
				"(In: number) => Out<unknown>",
				"(In: number) => Out<unknown>"
			)
		)
	})

	it("deep indiscriminable", () => {
		const $ = scope({
			a: { foo: ["string", "=>", s => s.trim()] },
			b: { foo: "symbol" },
			c: { bar: "symbol" }
		})

		// this is fine as a | b can be discriminated via foo
		const t = $.type("a|b")
		attest<
			| {
					foo: (In: string) => Out<string>
			  }
			| {
					foo: symbol
			  }
		>(t.t)

		attest(() => $.type("a|c")).throws(
			writeIndiscriminableMorphMessage(
				"{ foo: (In: string) => Out<unknown> }",
				"{ bar: symbol }"
			)
		)
	})

	it("array double intersection", () => {
		attest(() => {
			scope({
				a: { a: ["number>0", "=>", data => data + 1] },
				b: { a: ["number>0", "=>", data => data + 2] },
				c: "a[]&b[]"
			}).export()
		}).throws(
			writeMorphIntersectionMessage(
				"(In: number >0) => Out<unknown>",
				"(In: number >0) => Out<unknown>"
			)
		)
	})

	it("undiscriminated morph at path", () => {
		attest(() => {
			scope({
				a: { a: ["string", "=>", s => s.trim()] },
				b: { b: "bigint" },
				c: { key: "a|b" }
			}).export()
		}).throws(
			writeIndiscriminableMorphMessage(
				"{ a: (In: string) => Out<unknown> }",
				"{ b: bigint }"
			)
		)
	})

	it("helper morph intersection", () => {
		attest(() =>
			type("string")
				.pipe(s => s.length)
				.and(type("string").pipe(s => s.length))
		).throws(
			writeMorphIntersectionMessage(
				"(In: string) => Out<unknown>",
				"(In: string) => Out<unknown>"
			)
		)
	})

	it("union helper undiscriminated", () => {
		attest(() =>
			type("string")
				.pipe(s => s.length)
				.or("'foo'")
		).throws(
			writeIndiscriminableMorphMessage("(In: string) => Out<unknown>", '"foo"')
		)
	})

	it("allows undiscriminated union if morphs are equal", () => {
		const t = type({ foo: "1" })
			.or({ bar: "1" })
			.pipe(o => Object.values(o))

		attest<
			(
				In:
					| {
							foo: 1
					  }
					| {
							bar: 1
					  }
			) => Out<1[]>
		>(t.t)

		const serializedMorphs = t.internal.assertHasKind("morph").serializedMorphs

		attest(t.json).snap()
		attest(t({ foo: 1 })).snap()
		attest(t({ bar: 1 })).snap()
		attest(t({ baz: 2 }).toString()).snap()
	})
})
