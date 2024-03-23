import { attest } from "@arktype/attest"
import { scope, type, type Ark, type Type } from "arktype"
import { writeUndiscriminableMorphUnionMessage } from "../types/discriminate.js"
import type { Out } from "../types/morph.js"

describe("morph", () => {
	it("base", () => {
		const t = type("number").morph((data) => `${data}`)
		attest<Type<(In: number) => Out<string>>>(t)
		attest<string>(t.infer)
		attest<number>(t.in.infer)
		const { out } = t(5)
		attest<string | undefined>(out).equals("5")
		const { errors } = t("foo")
		attest(errors?.summary).snap("must be a number (was string)")
	})
	it("endomorph", () => {
		const t = type(["boolean", "=>", (data) => !data])
		attest<Type<(In: boolean) => Out<boolean>>>(t)
		const { out } = t(true)
		attest<boolean | undefined>(out).equals(false)
	})
	// it("chained to type", () => {
	// 	const t = type(["string>5", "=>", arktypes.parse.date])
	// 	attest<Type<(In: string) => Out<Date>>>(t)
	// 	attest(t("5/21/1993").out?.getDate()).equals(21)
	// 	attest(t("foobar").errors?.summary).snap(
	// 		"must be a valid date (was 'foobar')"
	// 	)
	// })
	it("validated output", () => {
		const parsedUser = type("string").morph((s) => JSON.parse(s), {
			name: "string",
			age: "number"
		})
		attest<
			Type<
				(In: string) => Out<{
					name: string
					age: number
				}>,
				Ark
			>
		>(parsedUser)
	})
	it("any as out", () => {
		const t = type("string", "=>", (s) => s as any)
		attest<string>(t.in.infer)
		attest<any>(t.infer)
	})
	it("never as out", () => {
		const t = type("string", "=>", (s) => s as never)
		attest<string>(t.in.infer)
		attest<never>(t.infer)
	})
	it("return problem", () => {
		const divide100By = type("number", "=>", (n, ctx) =>
			n !== 0 ? 100 / n : ctx.error("non-zero")
		)
		attest<Type<(In: number) => Out<number>>>(divide100By)
		attest(divide100By(5).out).equals(20)
		attest(divide100By(0).errors?.summary).snap("must be non-zero (was 0)")
	})
	it("at path", () => {
		const t = type({ a: ["string", "=>", (data) => data.length] })
		attest<Type<{ a: (In: string) => Out<number> }>>(t)

		const input = { a: "four" }

		const { data, out } = t(input)

		attest<{ a: number } | undefined>(out).equals({ a: 4 })
		attest<{ a: string } | undefined>(data).snap({ a: "four" })
		// out is cloned before the morph
		attest(out === (input as never)).equals(false)
		// data has the original reference + data
		attest(data === input).equals(true)
	})
	it("in array", () => {
		const types = scope({
			lengthOfString: ["string", "=>", (data) => data.length],
			mapToLengths: "lengthOfString[]"
		}).export()
		attest<Type<((In: string) => Out<number>)[]>>(types.mapToLengths)
		const { out } = types.mapToLengths(["1", "22", "333"])
		attest<number[] | undefined>(out).equals([1, 2, 3])
	})
	it("object to string", () => {
		const t = type([{ a: "string" }, "=>", (data) => JSON.stringify(data)])
		const { data, out } = t({ a: "foo" })
		attest<{ a: string } | undefined>(data).snap({ a: "foo" })
		attest<string | undefined>(out).snap('{"a":"foo"}')
	})
	it("intersection", () => {
		const $ = scope({
			b: "3.14",
			a: () => $.type("number"), //.morph((data) => `${data}`),
			aAndB: () => $.type("a&b"),
			bAndA: () => $.type("b&a")
		})
		// const types = $.compile()
		// attest<Type<(In: 3.14) => string>>(types.aAndB)
		// attest(types.aAndB.node).snap({
		//     number: { rules: { value: 3.14 }, morph: "(function)" }
		// })
		// attest<typeof types.aAndB>(types.bAndA)
		// attest(types.bAndA.node).equals(types.aAndB.node)
	})
	it("object intersection", () => {
		// const $ = scope({
		//     a: () => $.type({ a: "1" }).morph((data) => `${data}`),
		//     b: { b: "2" },
		//     c: "a&b"
		// })
		// const types = $.compile()
		// attest<Type<(In: { a: 1; b: 2 }) => string>>(types.c)
		// attest(types.c.node).snap({
		//     object: {
		//         rules: {
		//             props: {
		//                 a: { number: { value: 1 } },
		//                 b: { number: { value: 2 } }
		//             }
		//         },
		//         morph: "(function)"
		//     }
		// })
	})
	it("union", () => {
		const types = scope({
			a: ["number", "=>", (data) => `${data}`],
			b: "boolean",
			aOrB: "a|b",
			bOrA: "b|a"
		}).export()
		attest<Type<boolean | ((In: number) => Out<string>)>>(types.aOrB)
		// attest(types.aOrB.node).snap({
		//     number: { rules: {}, morph: "(function)" },
		//     boolean: true`
		// })
		// attest<typeof types.aOrB>(types.bOrA)
		// attest(types.bOrA.node).equals(types.aOrB.node)
	})
	it("union with output", () => {
		const t = type("number|parse.number")
		attest<number>(t.infer)
	})
	it("deep intersection", () => {
		// TODO: Fix
		// const types = scope({
		// 	a: { a: ["number>0", "=>", (data) => data + 1] },
		// 	b: { a: "1" },
		// 	c: "a&b"
		// }).export()
		// attest<Type<{ a: (In: 1) => Out<number> }>>(types.c)
		// attest(types.c.node).snap({
		//     object: {
		//         props: {
		//             a: { number: { rules: { value: 1 }, morph: "(function)" } }
		//         }
		//     }
		// })
	})
	it("deep union", () => {
		const types = scope({
			a: { a: ["number>0", "=>", (data) => `${data}`] },
			b: { a: "Function" },
			c: "a|b"
		}).export()
		attest<
			Type<
				| {
						a: (In: number) => Out<string>
				  }
				| {
						a: Function
				  }
			>
		>(types.c)

		// attest(types.c.node).snap({
		//     object: [
		//         {
		//             props: {
		//                 a: {
		//                     number: {
		//                         rules: {
		//                             range: {
		//                                 min: { limit: 0, comparator: ">" }
		//                             }
		//                         },
		//                         morph: "(function)"
		//                     }
		//                 }
		//             }
		//         },
		//         { props: { a: "Function" } }
		//     ]
		// })
	})
	it("chained reference", () => {
		const $ = scope({
			a: type("string").morph((s) => s.length),
			b: () => $.type("a").morph((n) => n === 0)
		})
		const types = $.export()
		attest<Type<(In: string) => Out<boolean>>>(types.b)
		// attest(types.b.node).snap({
		//     string: { rules: {}, morph: ["(function)", "(function)"] }
		// })
	})
	it("chained nested", () => {
		const $ = scope({
			a: type("string").morph((s) => s.length),
			b: () => $.type({ a: "a" }).morph(({ a }) => a === 0)
		})

		const types = $.export()
		attest<Type<(In: { a: string }) => Out<boolean>>>(types.b)
		// attest(types.b.node).snap({
		//     object: { rules: { props: { a: "a" } }, morph: "(function)" }
		// })
	})
	it("directly nested", () => {
		const t = type([
			{
				a: ["string", "=>", (s: string) => s.length]
			},
			"=>",
			({ a }) => a === 0
		])
		attest<Type<(In: { a: string }) => Out<boolean>>>(t)
		// attest(t.node).snap({
		//     object: {
		//         rules: {
		//             props: { a: { string: { rules: {}, morph: "(function)" } } }
		//         },
		//         morph: "(function)"
		//     }
		// })
	})
	it("discriminable tuple union", () => {
		const $ = scope({
			a: () => $.type(["string"]).morph((s) => [...s, "!"]),
			b: ["boolean"],
			c: () => $.type("a|b")
		})
		const types = $.export()
		attest<Type<[boolean] | ((In: [string]) => Out<string[]>)>>(types.c)
	})
	it("double intersection", () => {
		attest(() =>
			scope({
				a: ["boolean", "=>", (data) => `${data}`],
				b: ["boolean", "=>", (data) => `${data}!!!`],
				c: "a&b"
			}).export()
		).throws.snap("ParseError: Invalid intersection of morphs")
	})
	it("undiscriminated union", () => {
		// TODO: fix
		// attest(() => {
		// 	scope({
		// 		a: ["/.*/", "=>", (s) => s.trim()],
		// 		b: "string",
		// 		c: "a|b"
		// 	}).export()
		// }).throws(writeUndiscriminableMorphUnionMessage("/"))
	})
	it("deep double intersection", () => {
		attest(() => {
			scope({
				a: { a: ["boolean", "=>", (data) => `${data}`] },
				b: { a: ["boolean", "=>", (data) => `${data}!!!`] },
				c: "a&b"
			}).export()
		}).throws.snap("ParseError: Invalid intersection of morphs")
	})
	it("deep undiscriminated union", () => {
		attest(() => {
			scope({
				a: { a: ["string", "=>", (s) => s.trim()] },
				b: { a: "'foo'" },
				c: "a|b"
			}).export()
		}).throws(writeUndiscriminableMorphUnionMessage("/"))
	})
	it("deep undiscriminated reference", () => {
		const $ = scope({
			a: { a: ["string", "=>", (s) => s.trim()] },
			b: { a: "boolean" },
			c: { b: "boolean" }
		})
		const t = $.type("a|b")
		attest<
			Type<
				| {
						a: (In: string) => Out<string>
				  }
				| {
						a: boolean
				  }
			>
		>(t)

		attest(() => {
			scope({
				a: { a: ["string", "=>", (s) => s.trim()] },
				b: { b: "boolean" },
				c: "a|b"
			}).export()
		}).throws(writeUndiscriminableMorphUnionMessage("/"))
	})
	it("array double intersection", () => {
		// attest(() => {
		// 	scope({
		// 		a: { a: ["number>0", "=>", (data) => data + 1] },
		// 		b: { a: ["number>0", "=>", (data) => data + 2] },
		// 		c: "a[]&b[]"
		// 	}).export()
		// }).throws(
		// 	"At [index]/a: Intersection of morphs results in an unsatisfiable type"
		// )
	})
	it("undiscriminated morph at path", () => {
		attest(() => {
			scope({
				a: { a: ["string", "=>", (s) => s.trim()] },
				b: { b: "boolean" },
				c: { key: "a|b" }
			}).export()
		}).throws(writeUndiscriminableMorphUnionMessage("key"))
	})
	it("helper morph intersection", () => {
		attest(() =>
			type("string")
				.morph((s) => s.length)
				.and(type("string").morph((s) => s.length))
		).throws("Intersection of morphs results in an unsatisfiable type")
	})
	it("union helper undiscriminated", () => {
		attest(() =>
			type("string")
				.morph((s) => s.length)
				.or("'foo'")
		).throws(writeUndiscriminableMorphUnionMessage("/"))
	})
	it("ArkTypeError not included in return", () => {
		const parsedInt = type([
			"string",
			"=>",
			(s, ctx) => {
				const result = parseInt(s)
				if (Number.isNaN(result)) {
					return ctx.error("an integer string")
				}
				return result
			}
		])
		attest<Type<(In: string) => Out<number>>>(parsedInt)
		attest(parsedInt("5").out).snap(5)
		attest(parsedInt("five").errors?.summary).snap(
			'must be an integer string (was "five")'
		)
	})
	it("nullable return", () => {
		const toNullableNumber = type(["string", "=>", (s) => s.length || null])
		attest<Type<(In: string) => Out<number | null>>>(toNullableNumber)
	})
	it("undefinable return", () => {
		const toUndefinableNumber = type([
			"string",
			"=>",
			(s) => s.length || undefined
		])
		attest<Type<(In: string) => Out<number | undefined>>>(toUndefinableNumber)
	})
	it("null or undefined return", () => {
		const toMaybeNumber = type([
			"string",
			"=>",
			(s) => (s.length === 0 ? undefined : s.length === 1 ? null : s.length)
		])
		attest<Type<(In: string) => Out<number | null | undefined>>>(toMaybeNumber)
	})
})
