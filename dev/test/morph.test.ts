import { suite, test } from "mocha"
import { writeUndiscriminatableMorphUnionMessage } from "../../src/compile/discriminate.js"
import type { Problem } from "../../src/main.js"
import { arktypes, scope, type } from "../../src/main.js"
import type { Out } from "../../src/parse/ast/morph.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Type } from "../../src/type.js"
import { Path } from "../utils/src/lists.js"
import { attest } from "../attest/main.js"

suite("morph", () => {
    test("base", () => {
        const t = type("boolean").morph((data) => `${data}`)
        attest(t).typed as Type<(In: boolean) => string>
        attest(t.infer).typed as string
        const result = t(true)
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals("true").typed as string
        attest(t("foo").problems?.summary).snap("Must be boolean (was string)")
        attest(t.root).equals(type(["boolean", "|>", (data) => `${data}`]).root)
    })
    test("endomorph", () => {
        const t = type(["boolean", "|>", (data) => !data])
        attest(t).typed as Type<(In: boolean) => boolean>
        const result = t(true)
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals(false).typed as boolean
    })
    test("chained to type", () => {
        const t = type(["string>5", "|>", arktypes.parsedDate])
        attest(t).typed as Type<(In: string) => Out<Date>>
        attest(t("5/21/1993").data?.getDate()).equals(21)
        attest(t("foobar").problems?.summary).snap(
            "Must be a valid date (was 'foobar')"
        )
    })
    test("validated output", () => {
        const parsedUser = type("string").morph((s) => JSON.parse(s), {
            name: "string",
            age: "number"
        })
        attest(parsedUser).typed as Type<
            (In: string) => Out<{
                name: string
                age: number
            }>,
            Ark
        >
    })
    test("return problem", () => {
        const divide100By = type([
            "number",
            "|>",
            (n, problems) =>
                n === 0 ? problems.mustBe("non-zero", n, new Path()) : 100 / n
        ])
        attest(divide100By).typed as Type<(In: number) => number>
        attest(divide100By(5).data).equals(20)
        attest(divide100By(0).problems?.summary).snap(
            "Must be non-zero (was 0)"
        )
    })
    test("adds a problem if one is returned without being added", () => {
        const divide100By = type([
            "number",
            "|>",
            (n, problems) => {
                if (n !== 0) {
                    return 100 / n
                } else {
                    // problems.mustBe("non-zero")
                    // problems.byPath = {}
                    return (problems as unknown as Problem[]).pop()
                }
            }
        ])
        attest(divide100By(0).problems?.summary).snap(
            "Must be non-zero (was 0)"
        )
    })
    test("at path", () => {
        const t = type({ a: ["string", "|>", (data) => data.length] })
        attest(t).typed as Type<{
            a: (In: string) => number
        }>
        const result = t({ a: "four" })
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals({ a: 4 }).typed as {
            a: number
        }
    })
    test("in array", () => {
        const types = scope({
            lengthOfString: ["string", "|>", (data) => data.length],
            mapToLengths: "lengthOfString[]"
        }).export()
        attest(types.mapToLengths).typed as Type<((In: string) => number)[]>
        const result = types.mapToLengths(["1", "22", "333"])
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals([1, 2, 3]).typed as number[]
    })
    test("object inference", () => {
        const t = type([{ a: "string" }, "|>", (data) => `${data}`])
        attest(t).typed as Type<(In: { a: string }) => string>
    })
    test("intersection", () => {
        const $ = scope({
            b: "3.14",
            a: () => $.type("number"), //.morph((data) => `${data}`),
            aAndB: () => $.type("a&b"),
            bAndA: () => $.type("b&a")
        })
        // const types = $.compile()
        // attest(types.aAndB).typed as Type<(In: 3.14) => string>
        // attest(types.aAndB.node).snap({
        //     number: { rules: { value: 3.14 }, morph: "(function)" }
        // })
        // attest(types.bAndA).typed as typeof types.aAndB
        // attest(types.bAndA.node).equals(types.aAndB.node)
    })
    test("object intersection", () => {
        // const $ = scope({
        //     a: () => $.type({ a: "1" }).morph((data) => `${data}`),
        //     b: { b: "2" },
        //     c: "a&b"
        // })
        // const types = $.compile()
        // attest(types.c).typed as Type<(In: { a: 1; b: 2 }) => string>
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
    test("union", () => {
        const types = scope({
            a: ["number", "|>", (data) => `${data}`],
            b: "boolean",
            aOrB: "a|b",
            bOrA: "b|a"
        }).export()
        attest(types.aOrB).typed as Type<boolean | ((In: number) => string)>
        // attest(types.aOrB.node).snap({
        //     number: { rules: {}, morph: "(function)" },
        //     boolean: true
        // })
        // attest(types.bOrA).typed as typeof types.aOrB
        // attest(types.bOrA.node).equals(types.aOrB.node)
    })
    test("deep intersection", () => {
        const types = scope({
            a: { a: ["number>0", "|>", (data) => data + 1] },
            b: { a: "1" },
            c: "a&b"
        }).export()
        attest(types.c).typed as Type<{
            a: (In: 1) => number
        }>
        // attest(types.c.node).snap({
        //     object: {
        //         props: {
        //             a: { number: { rules: { value: 1 }, morph: "(function)" } }
        //         }
        //     }
        // })
    })
    test("deep union", () => {
        const types = scope({
            a: { a: ["number>0", "|>", (data) => `${data}`] },
            b: { a: "Function" },
            c: "a|b"
        }).export()
        attest(types.c).typed as Type<
            | {
                  a: (In: number) => string
              }
            | {
                  a: (...args: any[]) => unknown
              }
        >
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
    test("chained reference", () => {
        const $ = scope({
            a: type("string").morph((s) => s.length),
            b: () => $.type("a").morph((n) => n === 0)
        })
        const types = $.export()
        attest(types.b).typed as Type<(In: string) => boolean>
        // attest(types.b.node).snap({
        //     string: { rules: {}, morph: ["(function)", "(function)"] }
        // })
    })
    test("chained nested", () => {
        const $ = scope({
            a: type("string").morph((s) => s.length),
            b: () => $.type({ a: "a" }).morph(({ a }) => a === 0)
        })

        const types = $.export()
        attest(types.b).typed as Type<(In: { a: string }) => boolean>
        // attest(types.b.node).snap({
        //     object: { rules: { props: { a: "a" } }, morph: "(function)" }
        // })
    })
    test("directly nested", () => {
        const t = type([
            {
                a: ["string", "|>", (s: string) => s.length]
            },
            "|>",
            ({ a }) => a === 0
        ])
        attest(t).typed as Type<(In: { a: string }) => boolean>
        // attest(t.node).snap({
        //     object: {
        //         rules: {
        //             props: { a: { string: { rules: {}, morph: "(function)" } } }
        //         },
        //         morph: "(function)"
        //     }
        // })
    })
    test("discriminatable tuple union", () => {
        const $ = scope({
            a: () => $.type(["string"]).morph((s) => [...s, "!"]),
            b: ["boolean"],
            c: () => $.type("a|b")
        })
        const types = $.export()
        attest(types.c).typed as Type<[boolean] | ((In: [string]) => string[])>
    })
    test("double intersection", () => {
        // attest(() => {
        //     const z = scope({
        //         a: ["boolean", "|>", (data) => `${data}`],
        //         b: ["boolean", "|>", (data) => `${data}!!!`],
        //         c: "a&b"
        //     }).compile()
        // }).throws("Intersection of morphs results in an unsatisfiable type")
    })
    test("undiscriminated union", () => {
        attest(() => {
            scope({
                a: ["/.*/", "|>", (s) => s.trim()],
                b: "string",
                c: "a|b"
            }).export()
        }).throws(writeUndiscriminatableMorphUnionMessage("/"))
    })
    test("deep double intersection", () => {
        attest(() => {
            // const s = scope({
            //     a: { a: ["boolean", "|>", (data) => `${data}`] },
            //     b: { a: ["boolean", "|>", (data) => `${data}!!!`] },
            //     c: "a&b"
            // }).compile()
        }).throws(
            "At a: Intersection of morphs results in an unsatisfiable type"
        )
    })
    test("deep undiscriminated union", () => {
        attest(() => {
            scope({
                a: { a: ["string", "|>", (s) => s.trim()] },
                b: { a: "'foo'" },
                c: "a|b"
            }).export()
        }).throws(writeUndiscriminatableMorphUnionMessage("/"))
    })
    test("deep undiscriminated reference", () => {
        const $ = scope({
            a: { a: ["string", "|>", (s) => s.trim()] },
            b: { a: "boolean" },
            c: { b: "boolean" }
        })
        const t = $.type("a|b")
        attest(t).typed as Type<
            | {
                  a: (In: string) => string
              }
            | {
                  a: boolean
              }
        >
        attest(() => {
            scope({
                a: { a: ["string", "|>", (s) => s.trim()] },
                b: { b: "boolean" },
                c: "a|b"
            }).export()
        }).throws(writeUndiscriminatableMorphUnionMessage("/"))
    })
    test("array double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["number>0", "|>", (data) => data + 1] },
                b: { a: ["number>0", "|>", (data) => data + 2] },
                c: "a[]&b[]"
            }).export()
        }).throws(
            "At [index]/a: Intersection of morphs results in an unsatisfiable type"
        )
    })
    test("undiscriminated morph at path", () => {
        attest(() => {
            scope({
                a: { a: ["string", "|>", (s) => s.trim()] },
                b: { b: "boolean" },
                c: { key: "a|b" }
            }).export()
        }).throws(writeUndiscriminatableMorphUnionMessage("key"))
    })
    test("helper morph intersection", () => {
        attest(() =>
            type("string")
                .morph((s) => s.length)
                // @ts-expect-error
                .and(type("string").morph((s) => s.length))
        ).throwsAndHasTypeError(
            "Intersection of morphs results in an unsatisfiable type"
        )
    })
    test("union helper undiscriminated", () => {
        attest(() =>
            type("string")
                .morph((s) => s.length)
                .or("'foo'")
        ).throws(writeUndiscriminatableMorphUnionMessage("/"))
    })
    test("problem not included in return", () => {
        const parsedInt = type([
            "string",
            "|>",
            (s, problems) => {
                const result = parseInt(s)
                if (Number.isNaN(result)) {
                    return problems.mustBe("an integer string", s, new Path())
                }
                return result
            }
        ])
        attest(parsedInt).typed as Type<(In: string) => number>
        attest(parsedInt("5").data).snap(5)
        attest(parsedInt("five").problems?.summary).snap(
            "Must be an integer string (was 'five')"
        )
    })
    test("nullable return", () => {
        const toNullableNumber = type(["string", "|>", (s) => s.length || null])
        attest(toNullableNumber).typed as Type<(In: string) => number | null>
    })
    test("undefinable return", () => {
        const toUndefinableNumber = type([
            "string",
            "|>",
            (s) => s.length || undefined
        ])
        attest(toUndefinableNumber).typed as Type<
            (In: string) => number | undefined
        >
    })
    test("null or undefined return", () => {
        const toMaybeNumber = type([
            "string",
            "|>",
            (s) =>
                s.length === 0 ? undefined : s.length === 1 ? null : s.length
        ])
        attest(toMaybeNumber).typed as Type<
            (In: string) => number | null | undefined
        >
    })
})
