import { attest, contextualize } from "@arktype/attest"
import { assertNodeKind, type Out, type string } from "@arktype/schema"
import { scope, type Type, type } from "arktype"

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

		const morphs = t.raw.assertHasKind("morph").serializedMorphs
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

		const aMorphs = a.raw.assertHasKind("morph").serializedMorphs

		const b = type({ a: "string" }, "=>", o => o.a + "!")

		const bMorphs = b.raw.assertHasKind("morph").serializedMorphs

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
		assertNodeKind(types.bAndA.raw, "morph")
		assertNodeKind(types.aAndB.raw, "morph")

		attest<(In: 3.14) => Out<string>>(types.aAndB.t)
		attest(types.aAndB.json).snap({
			in: { unit: 3.14 },
			morphs: types.aAndB.raw.serializedMorphs
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
		assertNodeKind(types.c.raw, "morph")
		attest(types.c.json).snap({
			in: {
				domain: "object",
				required: [
					{ key: "a", value: { unit: 1 } },
					{ key: "b", value: { unit: 2 } }
				]
			},
			morphs: types.c.raw.serializedMorphs
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
			types.aOrB.raw.firstReferenceOfKindOrThrow("morph").serializedMorphs
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
			types.a.raw.firstReferenceOfKindOrThrow("morph").serializedMorphs

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
		assertNodeKind(types.b.raw, "morph")
		attest(types.b.json).snap({
			in: "string",
			morphs: types.b.raw.serializedMorphs
		})
	})

	it("chained nested", () => {
		const $ = scope({
			a: type("string").pipe(s => s.length),
			b: () => $.type({ a: "a" }).pipe(({ a }) => a === 0)
		})

		const types = $.export()
		attest<(In: { a: string }) => Out<boolean>>(types.b.t)
		assertNodeKind(types.b.raw, "morph")
		assertNodeKind(types.a.raw, "morph")
		attest(types.b.json).snap({
			in: {
				domain: "object",
				required: [
					{
						key: "a",
						value: {
							in: "string",
							morphs: types.a.raw.serializedMorphs
						}
					}
				]
			},
			morphs: types.b.raw.serializedMorphs
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
		assertNodeKind(t.raw, "morph")
		const nestedMorph = t.raw.firstReferenceOfKindOrThrow("morph")
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
			morphs: t.raw.serializedMorphs
		})
	})

	it("discriminable tuple union", () => {
		const $ = scope({
			a: () => $.type(["string"]).pipe(s => [...s, "!"]),
			b: ["boolean"],
			c: () => $.type("a|b")
		})
		const types = $.export()
		attest<[boolean] | ((In: [string]) => Out<string[]>)>(types.c.t)
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

	// TODO: reenable discrimination
	// it("deep intersection", () => {
	// 	const types = scope({
	// 		a: { a: ["number>0", "=>", (data) => data + 1] },
	// 		b: { a: "1" },
	// 		c: "a&b"
	// 	}).export()
	// 	attest<Type<{ a: (In: 1) => Out<number> }>>(types.c)
	// 	attest(types.c.json).snap()
	// })

	// it("double intersection", () => {
	// 	attest(() =>
	// 		scope({
	// 			a: ["boolean", "=>", (data) => `${data}`],
	// 			b: ["boolean", "=>", (data) => `${data}!!!`],
	// 			c: "a&b"
	// 		}).export()
	// 	).throws.snap("ParseError: Invalid intersection of morphs")
	// })

	// it("undiscriminated union", () => {
	// 	// TODO: fix
	// 	// attest(() => {
	// 	// 	scope({
	// 	// 		a: ["/.*/", "=>", (s) => s.trim()],
	// 	// 		b: "string",
	// 	// 		c: "a|b"
	// 	// 	}).export()
	// 	// }).throws(writeUndiscriminableMorphUnionMessage("/"))
	// })

	// it("deep double intersection", () => {
	// 	attest(() => {
	// 		scope({
	// 			a: { a: ["boolean", "=>", (data) => `${data}`] },
	// 			b: { a: ["boolean", "=>", (data) => `${data}!!!`] },
	// 			c: "a&b"
	// 		}).export()
	// 	}).throws.snap("ParseError: Invalid intersection of morphs")
	// })

	// it("deep undiscriminated union", () => {
	// 	attest(() => {
	// 		scope({
	// 			a: { a: ["string", "=>", (s) => s.trim()] },
	// 			b: { a: "'foo'" },
	// 			c: "a|b"
	// 		}).export()
	// 	}).throws(writeUndiscriminableMorphUnionMessage("/"))
	// })

	// it("deep undiscriminated reference", () => {
	// 	const $ = scope({
	// 		a: { a: ["string", "=>", (s) => s.trim()] },
	// 		b: { a: "boolean" },
	// 		c: { b: "boolean" }
	// 	})
	// 	const t = $.type("a|b")
	// 	attest<
	// 		Type<
	// 			| {
	// 					a: (In: string) => Out<string>
	// 			  }
	// 			| {
	// 					a: boolean
	// 			  }
	// 		>
	// 	>(t)

	// 	attest(() => {
	// 		scope({
	// 			a: { a: ["string", "=>", (s) => s.trim()] },
	// 			b: { b: "boolean" },
	// 			c: "a|b"
	// 		}).export()
	// 	}).throws(writeUndiscriminableMorphUnionMessage("/"))
	// })

	// it("array double intersection", () => {
	// 	// attest(() => {
	// 	// 	scope({
	// 	// 		a: { a: ["number>0", "=>", (data) => data + 1] },
	// 	// 		b: { a: ["number>0", "=>", (data) => data + 2] },
	// 	// 		c: "a[]&b[]"
	// 	// 	}).export()
	// 	// }).throws(
	// 	// 	"At [index]/a: Intersection of morphs results in an unsatisfiable type"
	// 	// )
	// })

	// it("undiscriminated morph at path", () => {
	// 	attest(() => {
	// 		scope({
	// 			a: { a: ["string", "=>", (s) => s.trim()] },
	// 			b: { b: "boolean" },
	// 			c: { key: "a|b" }
	// 		}).export()
	// 	}).throws(writeUndiscriminableMorphUnionMessage("key"))
	// })

	// it("helper morph intersection", () => {
	// 	attest(() =>
	// 		type("string")
	// 			.morph((s) => s.length)
	// 			.and(type("string").morph((s) => s.length))
	// 	).throws("Intersection of morphs results in an unsatisfiable type")
	// })

	// it("union helper undiscriminated", () => {
	// 	attest(() =>
	// 		type("string")
	// 			.morph((s) => s.length)
	// 			.or("'foo'")
	// 	).throws(writeUndiscriminableMorphUnionMessage("/"))
	// })
})
