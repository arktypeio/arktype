import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import type { DistributedValidator } from "../src/parse/tuple.js"

describe("narrow", () => {
    test("functional", () => {
        const isOdd = (n: number) => n % 2 === 1
        const t = type(["number", ":", isOdd])
        attest(t.infer).typed as number
        attest(t.root).equals({ number: { validator: isOdd as any } })
    })
    test("functional parameter inference", () => {
        attest(() => {
            type([
                "number|boolean[]",
                ":",
                // @ts-expect-error
                (data: number | string[]) => !!data
            ])
        }).type.errors("Type 'boolean' is not assignable to type 'string'.")
    })
    test("distributed", () => {
        const distributedBlacklist = {
            string: (s) => s !== "drop tables",
            number: (n) => !Number.isNaN(n)
        } satisfies DistributedValidator<unknown>
        const t = type(["string|number", ":", distributedBlacklist])
        attest(t.infer).typed as string | number
        attest(t.root).snap({
            string: { validator: distributedBlacklist.string },
            number: { validator: distributedBlacklist.number }
        })
    })
    test("distributed parameter inference", () => {
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
    test.skip("functional inference in tuple", () => {
        // TODO: https://github.com/arktypeio/arktype/issues/565
        // Nesting a tuple expression requiring functional inference in a tuple
        // like this currently breaks validation. This is likely a convoluted TS
        // bug, as the equivalent form in an object literal is correctly inferred.
        // @ts-expect-error
        type([["boolean", ":", (b) => b === true]]).infer
    })
})
