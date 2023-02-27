import { describe, it } from "mocha"
import { scope, type } from "../../src/main.ts"
import { writeUnboundableMessage } from "../../src/parse/ast/bound.ts"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.ts"
import { attest } from "../attest/main.ts"

describe("scope", () => {
    it("base definition", () => {
        const types = scope({ a: "string" }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" }).compile()
        ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
    })
    it("type definition", () => {
        const types = scope({ a: type("string") }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: type("strong") })
        ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
    })
    it("interdependent", () => {
        const types = scope({
            a: "string>5",
            b: "email<=10",
            c: "a&b"
        }).compile()
        attest(types.c.infer).typed as string
        attest(types.c.node).snap({
            string: {
                range: {
                    min: { comparator: ">", limit: 5 },
                    max: { comparator: "<=", limit: 10 }
                },
                regex: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
            }
        })
    })
    it("cyclic", () => {
        const types = scope({ a: { b: "b" }, b: { a: "a" } }).compile()
        attest(types.a.node).snap({
            object: { props: { b: "b" } }
        })
        // Type hint displays as "..." on hitting cycle (or any if "noErrorTruncation" is true)
        attest(types.a.infer).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        attest(types.b.infer.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(types.a.infer.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: any; }; }'.`
        )
    })
    it("object array", () => {
        const types = scope({ a: "string", b: [{ c: "a" }] }).compile()
        attest(types.b.infer).typed as [
            {
                c: string
            }
        ]
    })
    it("doesn't try to validate any in scope", () => {
        const $ = scope({ a: {} as any })
        attest($.infer).typed as { a: never }
        attest($.type(["number", "a"]).infer).typed as [number, never]
    })
    it("infers its own helpers", () => {
        const $ = scope({
            a: () => $.type("string"),
            b: () => $.type("number")
        })
        const types = $.compile()
        attest(types.a.infer).typed as string
        attest(types.b.infer).typed as number
    })
    it("allows semantically valid helpers", () => {
        const $ = scope({
            n: () => $.type("number"),
            lessThan10: () => $.type("n<10")
        })
        const types = $.compile()
        attest(types.n.infer).typed as number
        attest(types.lessThan10.infer).typed as number
        attest(types.lessThan10.node).snap({
            number: { range: { max: { comparator: "<", limit: 10 } } }
        })
    })
    it("errors on helper parse error", () => {
        attest(() => {
            const $ = scope({
                // @ts-expect-error
                a: () => $.type("kung|foo")
            })
            $.compile()
        }).throwsAndHasTypeError(writeUnresolvableMessage("kung"))
    })
    it("errors on semantically invalid helper", () => {
        attest(() => {
            const $ = scope({
                b: () => $.type("boolean"),
                // @ts-expect-error
                lessThan10: () => $.type("b<10")
            })
            $.compile()
        }).throwsAndHasTypeError(writeUnboundableMessage("'b'"))
    })
})
