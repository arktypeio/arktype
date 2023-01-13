import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { doubleMorphIntersectionMessage } from "../src/parse/string/ast.ts"
import type { Out } from "../src/parse/tuple/morph.ts"
import type { Type } from "../src/type.ts"

describe("morph", () => {
    it("base", () => {
        const t = type(["boolean", "=>", (data) => `${data}`])
        attest(t.t).typed as Type<(In: boolean) => Out<string>>
        attest(t.infer).typed as Type<string>
        attest(t.node).snap({ input: "boolean", morph: "<function>" })
        attest(t(true).data).equals(true).typed as boolean
        attest(t(true).out).equals("true").typed as string
        attest(t("foo").problems?.summary).snap()
    })
    it("endomorph", () => {
        const t = type(["boolean", "=>", (data) => !data])
        attest(t.t).typed as Type<(In: boolean) => Out<boolean>>
        attest(t(true).data).equals(true).typed as boolean
        attest(t(true).out).equals(false).typed as boolean
    })
    it("object inference", () => {
        const t = type([{ a: "string" }, "=>", (data) => `${data}`])
        attest(t.t).typed as Type<(In: { a: string }) => Out<string>>
    })
    it("intersection", () => {
        const types = scope({
            a: [{ a: "1" }, "=>", (data) => `${data}`],
            b: { b: "2" },
            aAndB: "a&b",
            bAndA: "b&a"
        })
        // attest(types.a).typed as Type<(In: { a: 1 }) => Out<string>>
        attest(types.aAndB).typed as Type<(In: { a: 1; b: 2 }) => Out<string>>
        attest(types.aAndB.node).snap({
            input: {
                object: {
                    props: {
                        a: { number: { value: 1 } },
                        b: { number: { value: 2 } }
                    }
                }
            },
            morph: "<function>"
        })
        attest(types.bAndA).typed as typeof types.aAndB
        attest(types.bAndA.node).equals(types.aAndB.node)
    })
    it("union", () => {
        const types = scope({
            a: ["number", "=>", (data) => `${data}`],
            b: "boolean",
            aOrB: "a|b",
            bOrA: "b|a"
        })
        attest(types.aOrB).typed as Type<(In: number | boolean) => Out<string>>
        attest(types.aOrB.node).snap({ input: {}, morph: "<function>" })
        attest(types.bOrA).typed as typeof types.aOrB
        attest(types.bOrA.node).equals(types.aOrB.node)
    })
    it("deep intersection", () => {
        const types = scope({
            a: { a: ["number>0", "=>", (data) => data + 1] },
            b: { a: "1" },
            c: "a&b"
        })
        attest(types.c).typed as Type<{
            a: (In: 1) => Out<number>
        }>
        attest(types.c.node).snap({
            object: {
                props: {
                    a: {
                        input: { number: { value: 1 } },
                        morph: "<function>" as any
                    }
                }
            }
        })
    })
    it("double intersection", () => {
        attest(() => {
            scope({
                a: ["boolean", "=>", (data) => `${data}`],
                b: ["boolean", "=>", (data) => `${data}!!!`],
                // @ts-expect-error
                c: "a&b"
            })
        }).throwsAndHasTypeError(
            // TODO: Add paths to these errors
            doubleMorphIntersectionMessage
        )
    })
    it("deep double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["boolean", "=>", (data) => `${data}`] },
                b: { a: ["boolean", "=>", (data) => `${data}!!!`] },
                // @ts-expect-error
                c: "a&b"
            })
        }).throwsAndHasTypeError(doubleMorphIntersectionMessage)
    })
    it("array double intersection", () => {
        attest(() => {
            scope({
                a: { a: ["number>0", "=>", (data) => data + 1] },
                b: { a: ["number>0", "=>", (data) => data + 1] },
                // @ts-expect-error
                c: "a[]&b[]"
            })
        }).throwsAndHasTypeError(doubleMorphIntersectionMessage)
    })
})
