import { describe, it } from "mocha"
import type { Type } from "../api.ts"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { assertEqual } from "../src/utils/generics.ts"

describe("narrow", () => {
    it("functional", () => {
        const isOdd = (n: number) => n % 2 === 1
        const t = type(["number", ":", isOdd])
        attest(t.infer).typed as number
        attest(t.node).equals({ number: { narrow: isOdd as any } })
    })
    it("functional narrowing", () => {
        const t = type(["number", ":", (n) => n === 1, "1"])
        attest(t).typed as Type<1>
    })
    it("functional parameter inference", () => {
        type Expected = number | boolean[]
        const validateNumberOrBooleanList = <t>(t: assertEqual<t, Expected>) =>
            true
        attest(
            type([
                "number|boolean[]",
                ":",
                (data) => validateNumberOrBooleanList(data)
            ]).infer
        ).typed as number | boolean[]
        attest(() => {
            type([
                "number|boolean[]",
                ":",
                // @ts-expect-error
                (data: number | string[]) => !!data
            ])
        }).type.errors("Type 'boolean' is not assignable to type 'string'.")
    })
    it("distributed", () => {
        const distributedBlacklist = {
            string: (s: string) => s !== "drop tables",
            number: (n: number) => !Number.isNaN(n)
        }
        const t = type(["string|number", ":", distributedBlacklist])
        attest(t.infer).typed as string | number
        attest(t.node).equals({
            string: { narrow: distributedBlacklist.string },
            number: { narrow: distributedBlacklist.number }
        })
    })
    it("distributed narrowing", () => {
        const t = type([
            "string|number",
            ":",
            {
                string: (s) => s === "zero",
                number: (n) => n === 0
            },
            "0|'zero'"
        ])
        attest(t).typed as Type<0 | "zero">
    })
    it("distributed parameter inference", () => {
        const validateInferredAsZero = (input: 0) => !input
        attest(() => {
            type([
                "0|boolean[]",
                ":",
                {
                    number: (n) => validateInferredAsZero(n),
                    // @ts-expect-error bad parameter type
                    object: (data: string[]) => !!data,
                    // @ts-expect-error domain not in original type
                    string: (data) => data === ""
                }
            ])
        }).type.errors("Type 'boolean[]' is not assignable to type 'string[]'.")
    })
    it("functional inference in tuple", () => {
        // https://github.com/arktypeio/arktype/issues/565
        // Nesting a tuple expression requiring functional inference in a tuple
        // like this currently breaks validation. This is likely a convoluted TS
        // bug, as the equivalent form in an object literal is correctly inferred.
        // @ts-expect-error
        type([["boolean", ":", (b) => b === true]]).infer
    })
    it("functional inference in scope", () => {
        // https://github.com/arktypeio/arktype/issues/577
        // There is a problem inferring tuple expressions that
        // reference an object in a scope. Based on some investigation, it has
        // to do with aliases being passed to validateDefinition and an object
        // type being parsed as the input definition. This explains why
        // following two cases don't fail.

        const bad = scope({
            a: [{ a: "1" }, "=>", (data) => `${data}`],
            // should be narrowed from {a: number} to {a: 1} but isn't
            b: [{ a: "number" }, ":", (data): data is { a: 1 } => true]
        }).compile()
        // inferred as never (should be string)
        bad.a.infer

        // works fine if input def is not a record or an alias resolving to a
        // record.
        const ok = scope({
            a: ["number", "=>", (data) => `${data}`],
            b: [["string"], "=>", (data) => data]
        }).compile()
        attest(ok.a.infer).typed as string
        attest(ok.b.infer).typed as [string]

        // original form works fine for types
        const okType = type({
            a: [{ a: "1" }, "=>", (data) => `${data}`]
        })
        attest(okType.infer).typed as { a: string }

        const workaround = scope({
            // added a workaround allowing out inference from an extra def at position 3
            a: [{ a: "1" }, "=>", (data) => `${data}`, "string"],
            // Also works for narrowing
            b: [
                { a: "number" },
                ":",
                (data): data is { a: 1 } => data.a === 1,
                { a: "1" }
            ],
            // can also avoid by explicitly annotating the input def, but that may be difficult if the scope is cyclic
            c: [{ a: "1" }, "=>", (data: { a: 1 }) => `${data}`]
        }).compile()
        attest(workaround.a.infer).typed as string
        attest(workaround.b.infer).typed as { a: 1 }
        attest(workaround.c.infer).typed as string
    })
})
