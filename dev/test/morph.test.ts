import { describe, it } from "mocha"
import type { Problem, Type } from "../../src/main.js"
import { ark, intersection, morph, scope, type, union } from "../../src/main.js"
import { writeUndiscriminatableMorphUnionMessage } from "../../src/parse/ast/union.js"
import { attest } from "arktype-attest"

describe("morph", () => {
    it("base", () => {
        const t = type(["boolean", "|>", (data) => `${data}`])
        attest(t).typed as Type<(In: boolean) => string>
        attest(t.infer).typed as string
        attest(t.node).snap({ boolean: { rules: {}, morph: "(function)" } })
        const result = t(true)
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals("true").typed as string
        attest(t("foo").problems?.summary).snap("Must be boolean (was string)")
    })
    it("endomorph", () => {
        const t = type(["boolean", "|>", (data) => !data])
        attest(t).typed as Type<(In: boolean) => boolean>
        const result = t(true)
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals(false).typed as boolean
    })
    it("from type", () => {
        const t = type(["string>5", "|>", ark.parsedDate])
        attest(t).typed as Type<(In: string) => Date>
        attest(t("5/21/1993").data?.getDate()).equals(21)
        attest(t("foobar").problems?.summary).snap(
            "Must be a valid date (was 'foobar')"
        )
    })
    it("return problem", () => {
        const divide100By = type([
            "number",
            "|>",
            (n, problems) => (n === 0 ? problems.mustBe("non-zero") : 100 / n)
        ])
        attest(divide100By).typed as Type<(In: number) => number>
        attest(divide100By(5).data).equals(20)
        attest(divide100By(0).problems?.summary).snap(
            "Must be non-zero (was 0)"
        )
    })
    it("adds a problem if one is returned without being added", () => {
        const divide100By = type([
            "number",
            "|>",
            (n, problems) => {
                if (n !== 0) {
                    return 100 / n
                } else {
                    problems.mustBe("non-zero")
                    problems.byPath = {}
                    return (problems as unknown as Problem[]).pop()
                }
            }
        ])
        attest(divide100By(0).problems?.summary).snap(
            "Must be non-zero (was 0)"
        )
    })
    it("at path", () => {
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
    it("in array", () => {
        const types = scope({
            lengthOfString: ["string", "|>", (data) => data.length],
            mapToLengths: "lengthOfString[]"
        }).compile()
        attest(types.mapToLengths).typed as Type<((In: string) => number)[]>
        const result = types.mapToLengths(["1", "22", "333"])
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals([1, 2, 3]).typed as number[]
    })
    it("object inference", () => {
        const t = type([{ a: "string" }, "|>", (data) => `${data}`])
        attest(t).typed as Type<(In: { a: string }) => string>
    })
    it("intersection", () => {
        const $ = scope({
            b: "3.14",
            a: () => $.morph("number", (data) => `${data}`),
            aAndB: () => $.type("a&b"),
            bAndA: () => $.type("b&a")
        })
        const types = $.compile()
        attest(types.aAndB).typed as Type<(In: 3.14) => string>
        attest(types.aAndB.node).snap({
            number: { rules: { value: 3.14 }, morph: "(function)" }
        })
        attest(types.bAndA).typed as typeof types.aAndB
        attest(types.bAndA.node).equals(types.aAndB.node)
    })
    it("object intersection", () => {
        const $ = scope({
            a: morph({ a: "1" }, (data) => `${data}`),
            b: { b: "2" },
            c: "a&b"
        })
        const types = $.compile()
        attest(types.c).typed as Type<(In: { a: 1; b: 2 }) => string>
        attest(types.c.node).snap({
            object: {
                rules: {
                    props: {
                        a: { number: { value: 1 } },
                        b: { number: { value: 2 } }
                    }
                },
                morph: "(function)"
            }
        })
    })
    it("union", () => {
        const types = scope({
            a: ["number", "|>", (data) => `${data}`],
            b: "boolean",
            aOrB: "a|b",
            bOrA: "b|a"
        }).compile()
        attest(types.aOrB).typed as Type<boolean | ((In: number) => string)>
        attest(types.aOrB.node).snap({
            number: { rules: {}, morph: "(function)" },
            boolean: true
        })
        attest(types.bOrA).typed as typeof types.aOrB
        attest(types.bOrA.node).equals(types.aOrB.node)
    })
    it("deep intersection", () => {
        const types = scope({
            a: { a: ["number>0", "|>", (data) => data + 1] },
            b: { a: "1" },
            c: "a&b"
        }).compile()
        attest(types.c).typed as Type<{
            a: (In: 1) => number
        }>
        attest(types.c.node).snap({
            object: {
                props: {
                    a: { number: { rules: { value: 1 }, morph: "(function)" } }
                }
            }
        })
    })
    it("deep union", () => {
        const types = scope({
            a: { a: ["number>0", "|>", (data) => `${data}`] },
            b: { a: "Function" },
            c: "a|b"
        }).compile()
        attest(types.c).typed as Type<
            | {
                  a: (In: number) => string
              }
            | {
                  a: (...args: any[]) => unknown
              }
        >
        attest(types.c.node).snap({
            object: [
                {
                    props: {
                        a: {
                            number: {
                                rules: {
                                    range: {
                                        min: { limit: 0, comparator: ">" }
                                    }
                                },
                                morph: "(function)"
                            }
                        }
                    }
                },
                { props: { a: "Function" } }
            ]
        })
    })
    it("chained", () => {
        const $ = scope({
            a: () => $.morph("string", (s) => s.length),
            b: () => $.morph("a", (n) => n === 0)
        })
        const types = $.compile()
        attest(types.b).typed as Type<(In: string) => boolean>
        attest(types.b.node).snap({
            string: { rules: {}, morph: ["(function)", "(function)"] }
        })
    })
    it("chained nested", () => {
        const $ = scope({
            a: () => $.morph("string", (s) => s.length),
            b: () => $.morph({ a: "a" }, ({ a }) => a === 0)
        })
        const types = $.compile()
        attest(types.b).typed as Type<(In: { a: string }) => boolean>
        attest(types.b.node).snap({
            object: { rules: { props: { a: "a" } }, morph: "(function)" }
        })
    })
    it("directly nested", () => {
        const t = type([
            {
                a: ["string", "|>", (s: string) => s.length]
            },
            "|>",
            ({ a }) => a === 0
        ])
        attest(t).typed as Type<(In: { a: string }) => boolean>
        attest(t.node).snap({
            object: {
                rules: {
                    props: { a: { string: { rules: {}, morph: "(function)" } } }
                },
                morph: "(function)"
            }
        })
    })
    it("discriminatable tuple union", () => {
        const $ = scope({
            a: () => $.morph(["string"], (s) => [...s, "!"]),
            b: ["boolean"],
            c: () => $.type("a|b")
        })
        const types = $.compile()
        attest(types.c).typed as Type<[boolean] | ((In: [string]) => string[])>
        attest(types.c.node).snap({
            object: [
                {
                    rules: {
                        class: `(function Array)`,
                        props: {
                            "0": "string",
                            length: ["!", { number: { value: 1 } }]
                        }
                    },
                    morph: "(function)"
                },
                {
                    class: `(function Array)`,
                    props: {
                        "0": "boolean",
                        length: ["!", { number: { value: 1 } }]
                    }
                }
            ]
        })
        attest(types.c.flat).snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: ["0"],
                    kind: "domain",
                    cases: {
                        string: [
                            ["class", "(function Array)"],
                            ["prerequisiteProp", ["length", [["value", 1]]]],
                            ["morph", "(function)"]
                        ],
                        boolean: [
                            ["class", "(function Array)"],
                            ["prerequisiteProp", ["length", [["value", 1]]]]
                        ]
                    }
                }
            ]
        ])
    })
    it("double intersection", () => {
        attest(() => {
            scope({
                a: ["boolean", "|>", (data) => `${data}`],
                b: ["boolean", "|>", (data) => `${data}!!!`],
                // @ts-expect-error
                c: "a&b"
            }).compile()
        }).throwsAndHasTypeError(
            "Intersection of morphs results in an unsatisfiable type"
        )
    })
    it("undiscriminated union", () => {
        attest(() => {
            scope({
                a: ["/.*/", "|>", (s) => s.trim()],
                b: "string",
                // @ts-expect-error
                c: "a|b"
            }).compile()
        }).throwsAndHasTypeError(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("deep double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["boolean", "|>", (data) => `${data}`] },
                b: { a: ["boolean", "|>", (data) => `${data}!!!`] },
                // @ts-expect-error
                c: "a&b"
            }).compile()
        }).throwsAndHasTypeError(
            "At a: Intersection of morphs results in an unsatisfiable type"
        )
    })
    it("deep undiscriminated union", () => {
        attest(() => {
            scope({
                a: { a: ["string", "|>", (s) => s.trim()] },
                b: { a: "'foo'" },
                // @ts-expect-error
                c: "a|b"
            }).compile()
        }).throwsAndHasTypeError(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("deep undiscriminated reference", () => {
        attest(() => {
            scope({
                a: { a: ["string", "|>", (s) => s.trim()] },
                b: { b: "boolean" },
                // @ts-expect-error
                c: "a|b"
            }).compile()
        }).throwsAndHasTypeError(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("array double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["number>0", "|>", (data) => data + 1] },
                b: { a: ["number>0", "|>", (data) => data + 2] },
                // @ts-expect-error
                c: "a[]&b[]"
            }).compile()
        }).throwsAndHasTypeError(
            "At [index]/a: Intersection of morphs results in an unsatisfiable type"
        )
    })
    it("undiscriminated morph at path", () => {
        attest(() => {
            scope({
                a: { a: ["string", "|>", (s) => s.trim()] },
                b: { b: "boolean" },
                // @ts-expect-error
                c: { key: "a|b" }
            }).compile()
        })
            .throws(writeUndiscriminatableMorphUnionMessage("key"))
            .type.errors(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("helper morph intersection", () => {
        attest(() =>
            intersection(
                ["string", "|>", (s) => s.length],
                ["string", "|>", (s) => s.split(",")]
            )
        ).throws("Intersection of morphs results in an unsatisfiable type")
    })
    it("union helper undiscriminated", () => {
        attest(() => union(["string", "|>", (s) => s.length], "'foo'")).throws(
            writeUndiscriminatableMorphUnionMessage("/")
        )
    })
    it("problem not included in return", () => {
        const parsedInt = type([
            "string",
            "|>",
            (s, problems) => {
                const result = parseInt(s)
                if (Number.isNaN(result)) {
                    return problems.mustBe("an integer string")
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
    it("nullable return", () => {
        const toNullableNumber = type(["string", "|>", (s) => s.length || null])
        attest(toNullableNumber).typed as Type<(In: string) => number | null>
    })
    it("undefinable return", () => {
        const toUndefinableNumber = type([
            "string",
            "|>",
            (s) => s.length || undefined
        ])
        attest(toUndefinableNumber).typed as Type<
            (In: string) => number | undefined
        >
    })
    it("null or undefined return", () => {
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
