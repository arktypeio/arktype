import { describe, it } from "mocha"
import type { Type } from "../api.ts"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeUndiscriminatableMorphUnionMessage } from "../src/parse/string/ast.ts"
import type { Out } from "../src/parse/tuple/morph.ts"

describe("morph", () => {
    it("base", () => {
        const t = type(["boolean", "=>", (data) => `${data}`])
        attest(t).typed as Type<(In: boolean) => Out<string>>
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
        const t = type(["boolean", "=>", (data) => !data])
        attest(t).typed as Type<(In: boolean) => Out<boolean>>
        const result = t(true)
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals(false).typed as boolean
    })
    it("at path", () => {
        const t = type({ a: ["string", "=>", (data) => data.length] })
        attest(t).typed as Type<{
            a: (In: string) => Out<number>
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
            lengthOfString: ["string", "=>", (data) => data.length],
            mapToLengths: "lengthOfString[]"
        }).compile()
        attest(types.mapToLengths).typed as Type<
            ((In: string) => Out<number>)[]
        >
        const result = types.mapToLengths(["1", "22", "333"])
        if (result.problems) {
            return result.problems.throw()
        }
        attest(result.data).equals([1, 2, 3]).typed as number[]
    })
    it("object inference", () => {
        const t = type([{ a: "string" }, "=>", (data) => `${data}`])
        attest(t).typed as Type<(In: { a: string }) => Out<string>>
    })
    it("intersection", () => {
        const types = scope({
            b: "3.14",
            a: ["number", "=>", (data) => `${data}`, "string"],
            aAndB: "a&b",
            bAndA: "b&a"
        }).compile()
        attest(types.aAndB).typed as Type<(In: 3.14) => Out<string>>
        attest(types.aAndB.node).snap({
            number: { rules: { value: 3.14 }, morph: "(function)" }
        })
        attest(types.bAndA).typed as typeof types.aAndB
        attest(types.bAndA.node).equals(types.aAndB.node)
    })
    it("object interesection", () => {
        const types = scope({
            a: [{ a: "1" }, "=>", (data) => `${data}`, "string"],
            b: { b: "2" },
            c: "a&b"
        }).compile()
        attest(types.c).typed as Type<(In: { a: 1; b: 2 }) => Out<string>>
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
            a: ["number", "=>", (data) => `${data}`],
            b: "boolean",
            aOrB: "a|b",
            bOrA: "b|a"
        }).compile()
        attest(types.aOrB).typed as Type<
            boolean | ((In: number) => Out<string>)
        >
        attest(types.aOrB.node).snap({
            number: { rules: {}, morph: "(function)" },
            boolean: true
        })
        attest(types.bOrA).typed as typeof types.aOrB
        attest(types.bOrA.node).equals(types.aOrB.node)
    })
    it("deep intersection", () => {
        const types = scope({
            a: { a: ["number>0", "=>", (data) => data + 1] },
            b: { a: "1" },
            c: "a&b"
        }).compile()
        attest(types.c).typed as Type<{
            a: (In: 1) => Out<number>
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
            a: { a: ["number>0", "=>", (data) => `${data}`] },
            b: { a: "Function" },
            c: "a|b"
        }).compile()
        attest(types.c).typed as Type<
            | {
                  a: (In: number) => Out<string>
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
        const types = scope({
            a: ["string", "=>", (s) => s.length, "number"],
            b: ["a", "=>", (n) => n === 0]
        }).compile()
        attest(types.b).typed as Type<(In: string) => Out<boolean>>
        attest(types.b.node).snap({
            string: { rules: {}, morph: ["(function)", "(function)"] }
        })
    })
    it("chained nested", () => {
        const types = scope({
            a: ["string", "=>", (s) => s.length, "number"],
            b: [{ a: "a" }, "=>", ({ a }) => a === 0, "boolean"]
        }).compile()
        attest(types.b).typed as Type<(In: { a: string }) => Out<boolean>>
        attest(types.b.node).snap({
            object: { rules: { props: { a: "a" } }, morph: "(function)" }
        })
    })
    it("directly nested", () => {
        const t = type([
            {
                a: ["string", "=>", (s: string) => s.length]
            },
            "=>",
            ({ a }) => a === 0
        ])
        attest(t).typed as Type<(In: { a: string }) => Out<boolean>>
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
        const types = scope({
            a: [["string"], "=>", (s) => [...s, "!"], "string[]"],
            b: ["boolean"],
            c: "a|b"
        }).compile()
        attest(types.c).typed as Type<
            [boolean] | ((In: [string]) => Out<string[]>)
        >
        attest(types.c.node).snap({
            object: [
                {
                    rules: {
                        class: "Array",
                        props: {
                            "0": "string",
                            length: { number: { value: 1 } }
                        }
                    },
                    morph: "(function)"
                },
                {
                    class: "Array",
                    props: { "0": "boolean", length: { number: { value: 1 } } }
                }
            ]
        })
    })
    it("double intersection", () => {
        attest(() => {
            scope({
                a: ["boolean", "=>", (data) => `${data}`],
                b: ["boolean", "=>", (data) => `${data}!!!`],
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
                a: ["/.*/", "=>", (s) => s.trim()],
                b: "string",
                // @ts-expect-error
                c: "a|b"
            }).compile()
        }).throwsAndHasTypeError(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("deep double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["boolean", "=>", (data) => `${data}`] },
                b: { a: ["boolean", "=>", (data) => `${data}!!!`] },
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
                a: { a: ["string", "=>", (s) => s.trim()] },
                b: { a: "'foo'" },
                // @ts-expect-error
                c: "a|b"
            }).compile()
        }).throwsAndHasTypeError(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("deep undiscriminated reference", () => {
        attest(() => {
            scope({
                a: { a: ["string", "=>", (s) => s.trim()] },
                b: { b: "boolean" },
                // @ts-expect-error
                c: "a|b"
            }).compile()
        }).throwsAndHasTypeError(writeUndiscriminatableMorphUnionMessage("/"))
    })
    it("array double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["number>0", "=>", (data) => data + 1] },
                b: { a: ["number>0", "=>", (data) => data + 2] },
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
                a: { a: ["string", "=>", (s) => s.trim()] },
                b: { b: "boolean" },
                // @ts-expect-error
                c: { key: "a|b" }
            }).compile()
        })
            .throws(writeUndiscriminatableMorphUnionMessage("key"))
            .type.errors(writeUndiscriminatableMorphUnionMessage("/"))
    })
})
