import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { assertEqual } from "../src/utils/generics.ts"

describe("refinement", () => {
    // it("functional", () => {
    //     const isOdd = (n: number) => n % 2 === 1
    //     const t = type(["number", "=>", isOdd])
    //     attest(t.infer).typed as number
    //     attest(t.root).equals({ number: { refinement: isOdd as any } })
    // })
    // it("functional parameter inference", () => {
    //     type Expected = number | boolean[]
    //     const validateNumberOrBooleanList = <t>(t: assertEqual<t, Expected>) =>
    //         true
    //     attest(
    //         type([
    //             "number|boolean[]",
    //             "=>",
    //             (data) => validateNumberOrBooleanList(data)
    //         ]).infer
    //     ).typed as number | boolean[]
    //     attest(() => {
    //         type([
    //             "number|boolean[]",
    //             "=>",
    //             // @ts-expect-error
    //             (data: number | string[]) => !!data
    //         ])
    //     }).type.errors("Type 'boolean' is not assignable to type 'string'.")
    // })
    // it("distributed", () => {
    //     const distributedBlacklist = {
    //         string: (s: string) => s !== "drop tables",
    //         number: (n: number) => !Number.isNaN(n)
    //     }
    //     const t = type(["string|number", "=>", distributedBlacklist])
    //     attest(t.infer).typed as string | number
    //     attest(t.root).snap({
    //         string: { refinement: distributedBlacklist.string },
    //         number: { refinement: distributedBlacklist.number }
    //     })
    // })
    // it("distributed parameter inference", () => {
    //     const validateInferredAsZero = (input: 0) => !input
    //     attest(() => {
    //         type([
    //             "0|boolean[]",
    //             "=>",
    //             {
    //                 number: (n) => validateInferredAsZero(n),
    //                 // @ts-expect-error bad parameter type
    //                 object: (data: string[]) => !!data,
    //                 // @ts-expect-error domain not in original type
    //                 string: (data) => data === ""
    //             }
    //         ])
    //     }).type.errors("Type 'boolean[]' is not assignable to type 'string[]'.")
    // })
    // it("functional inference in tuple", () => {
    //     // TODO: https://github.com/arktypeio/arktype/issues/565
    //     // Nesting a tuple expression requiring functional inference in a tuple
    //     // like this currently breaks validation. This is likely a convoluted TS
    //     // bug, as the equivalent form in an object literal is correctly inferred.
    //     // @ts-expect-error
    //     type([["boolean", "=>", (b) => b === true]]).infer
    // })
})
